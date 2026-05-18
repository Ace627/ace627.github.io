# copyText

## 类型定义

```typescript
/** 复制文本的配置选项 */
export interface CopyTextOptions {
  /** 是否允许复制空白内容（空字符串或纯空格），默认 false */
  allowWhitespace?: boolean
  /** 是否使用旧版复制方法（基于 document.execCommand，不支持空白内容复制），默认 false */
  legacy?: boolean
}

/** 复制文本操作返回的结果 */
export interface CopyTextReturn {
  /** 是否复制成功 */
  success: boolean
  /** 描述操作结果的消息，例如成功时的 "复制成功" 或失败时的错误原因 */
  message: string
}
```

## 功能实现

```typescript
/**
 * 复制文本到剪贴板工具函数
 * @param {string} content 需要复制的文本内容
 * @returns {Promise<CopyTextReturn>} 复制文本操作返回的结果
 */
export async function copyText(content: string, options: CopyTextOptions = {}): Promise<CopyTextReturn> {
  try {
    const { allowWhitespace = false, legacy = false } = options
    if (!allowWhitespace && (!content || content.trim() === '')) {
      TipModal.msgError('复制内容不能为空')
      return { success: false, message: '复制内容不能为空' }
    } else if (navigator.clipboard && window.isSecureContext && !legacy) {
      await navigator.clipboard.writeText(content)
    } else {
      const textarea = document.createElement('textarea')
      textarea.style.cssText = 'position:fixed; opacity:0; z-index:-9999; left:-9999px; top:-9999px;'
      textarea.value = content
      document.body.appendChild(textarea)
      textarea.select()
      textarea.setSelectionRange?.(0, content.length)
      const copied = document.execCommand('copy')
      document.body.removeChild(textarea)
      if (!copied) throw new Error('浏览器限制或无法复制')
    }
    TipModal.msgSuccess('复制成功')
    return { success: true, message: '复制成功' }
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : '未知错误'
    TipModal.msgError(`复制失败：${errMsg}`)
    return { success: false, message: `${errMsg}` }
  }
}
```
