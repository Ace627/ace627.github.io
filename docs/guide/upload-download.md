# 上传下载

上传下载能力分两层：`modules/common/upload` 是通用上传，只负责把文件落到磁盘；`modules/system/file` 是文件管理，负责目录树、登记、下载与回收站。物理文件按内容 SHA-256 命名，平铺存储在项目根目录 `uploads/` 下，元数据入库 `sys_file` 表。参考实现：`views/example/upload` 与 `views/system/file`。

## 存储与静态访问

- 文件以 `{sha256}{扩展名}` 命名，内容相同即路径相同，秒传与去重都建立在这个基础上
- `main.ts` 将 `uploads` 目录挂为静态资源，访问路径 `{globalPrefix}/uploads/文件名`，头像等场景直接拼 URL 访问
- 接口与数据库统一存相对路径 `uploads/xxx.png`

## 通用上传端点

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/common/upload/file` | 单文件上传，限 10MB 以内 |
| POST | `/common/upload/check` | 秒传与断点续传检查，按文件哈希 |
| POST | `/common/upload/chunk` | 上传单个分片，挂 `@SkipThrottle` 豁免限流 |
| POST | `/common/upload/chunk/merge` | 合并全部分片 |
| DELETE | `/common/upload/chunk/clear` | 清理未合并的分片目录 |

### 单文件上传

文件以内存 Buffer 进入 Service，处理流程：

```typescript
public async uploadFile(file: ExpressMulterFile) {
  if (file.size > 10 * 1024 * 1024) throw new BusinessException('文件大于10MB，请使用分片上传')
  const ext = extname(Buffer.from(file.originalname, 'latin1').toString('utf8'))
  const filename = `${createSha256(file.buffer)}${ext}`
  const filePath = resolve(this.UPLOAD_DIR_PATH, filename)
  if (existsSync(filePath)) return `uploads/${filename}`
  writeFileSync(filePath, file.buffer)
  return `uploads/${filename}`
}
```

- 超过 10MB 直接拒绝，提示走分片上传
- 文件名做 latin1 转 utf8，修复 multipart 中文乱码
- 按内容计算 SHA-256 作为文件名，文件已存在直接返回路径，即小文件秒传

### 分片上传约定

- `fileHash` 是文件整体哈希，同时用作分片临时目录名与最终文件名，分片存于 `uploads/{fileHash}/`
- `chunkHash` 格式为 `{分片哈希}-{序号}`，合并时按尾部序号排序
- 合并用 `createReadStream` 接 `createWriteStream` 流式写入，不整块占用内存，合并完成即清理临时目录
- 最终文件已存在提示「文件已存在，无需合并」，分片目录不存在提示重新上传

## 分片上传全流程

参考实现 `views/example/upload`，链路六步：

1. **切片**：`File.slice` 按 5MB 切割
2. **计算哈希**：主线程 `FileReader.readAsArrayBuffer` 逐片读取，零拷贝传给 Web Worker，Worker 内用 `crypto.subtle.digest('SHA-256')` 计算各分片哈希，收齐后拼接完整二进制算出文件哈希。计算全程在 Worker 线程，不阻塞页面
3. **秒传与断点检查**：调 `check` 接口，`isExist: true` 表示服务器已有同哈希文件，跳过上传直接完成；否则返回已落盘的分片列表，从断点继续，无需重传整个文件
4. **并发上传**：3 路并发协程池，每个分片携带 `AbortController` 信号，支持暂停、继续、取消
5. **合并**：全部分片上传完毕后调 merge 接口合成最终文件
6. **登记**：需要纳入文件管理时调 `register`，把物理文件登记为目录下的文件记录

## 文件管理

目录与文件同表存储于 `sys_file`，`parent_id` 自关联加 `ancestors` 冗余链支撑子树级联，与部门表同一套设计。文件记录额外持有 `fileHash`、`filePath`、`fileSize`、`fileExt`、`mimeType`。

| 方法 | 路径 | 权限码 | 说明 |
| --- | --- | --- | --- |
| GET | `/system/file/tree` | `system:file:query` | 目录树，仅目录、未删除 |
| GET | `/system/file/list` | `system:file:query` | 当前目录下文件分页列表 |
| POST | `/system/file/folder/create` | `system:file:create` | 新建目录 |
| PUT | `/system/file/folder/update` | `system:file:update` | 重命名目录 |
| PUT | `/system/file/move` | `system:file:update` | 移动文件或目录（防环校验，目录子树级联平移） |
| DELETE | `/system/file/delete` | `system:file:delete` | 删除文件或目录，软删进回收站 |
| POST | `/system/file/register` | `system:file:create` | 上传登记 |
| GET | `/system/file/download` | `system:file:query` | 文件下载 |
| GET | `/system/file/recycle/list` | `system:file:recycle` | 回收站分页列表 |
| PUT | `/system/file/recycle/restore` | `system:file:recycle` | 回收站还原 |
| DELETE | `/system/file/recycle/delete` | `system:file:recycle` | 彻底删除 |
| DELETE | `/system/file/recycle/clear` | `system:file:recycle` | 清空回收站 |

### 上传登记

单传或分片合并成功后调用，把物理文件登记为目录下的一条文件记录：

```typescript
public async register(registerDto: RegisterFileDto): Promise<string> {
  const parentId = registerDto.parentId || CommonConstant.DEFAULT_PARENT_ID
  await this.assertParentFolder(parentId)
  const physicalPath = resolve(this.UPLOAD_DIR_PATH, `${registerDto.fileHash}${fileExt}`)
  if (!existsSync(physicalPath)) throw new BusinessException('物理文件不存在，请先完成上传')
  // 同目录同哈希已登记则直接返回，秒传场景重复登记不产生重复记录
  const registered = await this.fileRepository.findOneBy({ parentId: Equal(parentId), fileHash: Equal(registerDto.fileHash) })
  if (registered) return '文件已登记'
  /* 构建实体入库：fileName 原始名、fileHash、filePath、fileSize、fileExt、mimeType */
}
```

### 文件下载

流式响应。磁盘上是哈希文件名，下载时用登记的 `fileName` 还原：

```typescript
public async download(id: string): Promise<StreamableFile> {
  const entity = await this.fileRepository.findOneBy({ id: Equal(id) })
  if (!entity || entity.fileType !== FileType.FILE) throw new BusinessException('文件不存在')
  const physicalPath = resolve(process.cwd(), entity.filePath)
  if (!existsSync(physicalPath)) throw new BusinessException('物理文件已丢失，请联系管理员')
  const filename = encodeURIComponent(entity.fileName)
  return new StreamableFile(createReadStream(physicalPath), {
    disposition: `attachment; filename="${filename}"; filename*=UTF-8''${filename}`,
    type: entity.mimeType || 'application/octet-stream',
  })
}
```

前端与 Excel 导出同款写法：请求类指定 `responseType: 'blob'`，从 `content-disposition` 解析文件名，`linkDownload` 触发保存。端点挂 `@SkipTransform()`，保证二进制流不被统一响应结构包裹。

### 回收站

- 删除为软删，目录按 `ancestors` 前缀级联软删整棵子树，回收站可还原
- 彻底删除前统计同一 `fileHash` 是否仍被其他记录引用，无引用才删磁盘文件。内容寻址存储下一个物理文件可能对应多条逻辑记录，直接删会误伤
- 返回信息汇报实际清理数量，如「彻底删除成功，清理物理文件 2 个」

## 设计取舍

- **上传与登记分离**：通用上传不依赖数据库，头像等场景拿到路径即走；需要纳入文件管理时再调 `register`
- **内容寻址与幂等**：同内容文件全库只有一份物理副本，登记与合并环节都有幂等保护，秒传、重复上传、断点重传均不产生冗余
- **全程流式**：分片合并与下载均为流式读写，大文件不占内存
- **断点续传零状态**：分片按哈希落盘，检查接口返回已完成分片即可续传，服务端不维护上传状态表
