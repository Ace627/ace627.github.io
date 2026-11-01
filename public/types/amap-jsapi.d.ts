/**
 * 高德地图 JS API 2.0 类型声明
 * 覆盖本教程系列用到的全部核心类与插件
 *
 * 用法：放到项目 src/types/ 下即可，无需任何 tsconfig 配置
 * 注意：不要再安装 @amap/amap-jsapi-types / @vuemap/amap-jsapi-types，
 *       两份声明会合并导致命名空间重复冲突
 */

declare namespace AMap {
  // ---------- 基础类型 ----------

  class LngLat {
    lng: number
    lat: number
    constructor(lng: number, lat: number)
  }

  class Pixel {
    x: number
    y: number
    constructor(x: number, y: number)
  }

  class Size {
    width: number
    height: number
    constructor(width: number, height: number)
  }

  /** 控件停靠位置：左上 / 右上 / 左下 / 右下 */
  type ControlPosition = 'LT' | 'RT' | 'LB' | 'RB'

  interface ControlConfig {
    /** 停靠位置，不传时用控件默认位置 */
    position?: ControlPosition
    offset?: Pixel
  }

  // ---------- 地图 ----------

  interface MapOptions {
    viewMode?: '2D' | '3D'
    /** 初始缩放级别（3~20） */
    zoom?: number
    /** 缩放级别范围，如 [3, 20] */
    zooms?: [number, number]
    /** 初始中心点 [经度, 纬度] */
    center?: [number, number] | LngLat
    mapStyle?: string
    /** 初始俯仰角（3D 模式，0~83） */
    pitch?: number
    /** 初始旋转角 */
    rotation?: number
    /** 是否可旋转 */
    rotateEnable?: boolean
    /** 是否有动画 */
    animateEnable?: boolean
    /** 标注层级 */
    labelzIndex?: number
    /** 显示的地图要素：背景/路网/建筑/注记 */
    features?: ('bg' | 'road' | 'building' | 'point')[]
    /** 是否展示建筑楼块（自建 Buildings 楼块图层时须关闭，避免两层叠加） */
    showBuildingBlock?: boolean
    /** 是否可拖拽 */
    dragEnable?: boolean
    /** 是否可缩放 */
    zoomEnable?: boolean
    /** 是否可倾斜（3D） */
    pitchEnable?: boolean
    /** 是否可双击缩放 */
    doubleClickZoom?: boolean
    /** 是否可键盘操作 */
    keyboardEnable?: boolean
    /** 是否开启慢动作（惯性缓动） */
    jogEnable?: boolean
    /** 是否可滚轮缩放 */
    scrollWheel?: boolean
    /** 是否可触摸缩放 */
    touchZoom?: boolean
    /** 双指缩放中心，1 为手势中心 */
    touchZoomCenter?: number
    /** 缩放速度 */
    zoomSpeed?: number
    /** 是否显示地图热点 */
    isHotspot?: boolean
    /** 地图遮罩（多边形区域，如只显示某个行政区） */
    mask?: unknown
  }

  class Map {
    constructor(container: HTMLElement | string | null, options?: MapOptions)
    /** 销毁地图，组件卸载时必须调用，否则内存泄漏 */
    destroy(): void
    add(overlays: unknown | unknown[]): void
    remove(overlays: unknown | unknown[]): void
    /** 清空地图上所有覆盖物 */
    clearMap(): void
    addControl(control: unknown): void
    removeControl(control: unknown): void
    setZoom(zoom: number): void
    getZoom(): number
    zoomIn(): void
    zoomOut(): void
    setCenter(center: [number, number] | LngLat): void
    getCenter(): LngLat
    panTo(position: [number, number] | LngLat): void
    /** 一步到位：同时设置缩放 + 中心 */
    setZoomAndCenter(zoom: number, center: [number, number] | LngLat): void
    /** 俯仰角（3D 模式） */
    setPitch(pitch: number): void
    getPitch(): number
    /** 旋转角 */
    setRotation(rotation: number): void
    getRotation(): number
    /** 限制地图可拖动范围：[西南角经, 西南角纬, 东北角经, 东北角纬] */
    setLimitBounds(bounds: unknown): void
    clearLimitBounds(): void
    setMapStyle(style: string): void
    /** 自适应显示所有覆盖物，padding 为 [上, 右, 下, 左] 像素边距 */
    setFitView(
      overlays?: unknown | unknown[] | null,
      immediately?: boolean,
      padding?: [number, number, number, number],
      avoid?: [number, number],
    ): void
    on(event: string, handler: (event: any) => void): void
  }

  // ---------- 覆盖物 ----------

  /** 覆盖物基类：所有可以 add/remove 到地图上的对象 */
  class Overlay {
    on(event: string, handler: (event: any) => void): void
  }

  interface MarkerOptions {
    position: [number, number] | LngLat
    /** 传入地图后，创建即自动添加到地图，无需再 map.add */
    map?: Map | null
    /** 鼠标悬浮提示 */
    title?: string
    /** 自定义图标 URL（与 content 二选一） */
    icon?: string
    /** 自定义 DOM 内容（与 icon 二选一），如起终点标记 */
    content?: string | HTMLElement
    /** 图标锚点偏移：按图标尺寸算，水平 -width/2、垂直 -height */
    offset?: Pixel
    autoRotation?: boolean
  }

  class Marker extends Overlay {
    constructor(options?: MarkerOptions)
    getPosition(): LngLat | null
    setPosition(position: [number, number] | LngLat): void
    setIcon(icon: string): void
    /** 轨迹回放：让标记沿路径移动 */
    moveAlong(path: ([number, number] | LngLat)[], options?: MoveAlongOptions): void
    pauseMove(): void
    resumeMove(): void
    stopMove(): void
  }

  interface MoveAlongOptions {
    /** 每段耗时（毫秒） */
    duration?: number
    autoRotation?: boolean
  }

  interface InfoWindowOptions {
    content?: string | HTMLElement
    offset?: Pixel
  }

  class InfoWindow {
    constructor(options?: InfoWindowOptions)
    open(map: Map | null, position: LngLat | [number, number]): void
    close(): void
    setContent(content: string | HTMLElement): void
  }

  interface ShapeOptions {
    strokeColor?: string
    strokeWeight?: number
    /** 描边透明度 0~1 */
    strokeOpacity?: number
    /** 线段转折处样式 */
    lineJoin?: 'round' | 'bevel' | 'miter'
    /** 线段两端样式 */
    lineCap?: 'round' | 'butt' | 'square'
    strokeStyle?: 'solid' | 'dashed'
    fillColor?: string
    fillOpacity?: number
  }

  interface CircleOptions extends ShapeOptions {
    center: [number, number] | LngLat
    /** 半径（米） */
    radius: number
  }

  class Circle extends Overlay {
    constructor(options?: CircleOptions)
  }

  interface PolygonOptions extends ShapeOptions {
    path: [number, number][]
  }

  class Polygon extends Overlay {
    constructor(options?: PolygonOptions)
  }

  interface PolylineOptions extends ShapeOptions {
    path: [number, number][]
    /** 白色方向箭头，画路线时很实用 */
    showDir?: boolean
  }

  class Polyline extends Overlay {
    constructor(options?: PolylineOptions)
  }

  /** 海量点数据项 */
  interface MassPoint {
    lnglat: [number, number]
    name?: string
    /** 样式索引，对应 style 数组下标 */
    style?: number
  }

  interface MassMarksStyle {
    url: string
    size: Size
    anchor?: [number, number]
  }

  interface MassMarksOptions {
    style: MassMarksStyle[]
  }

  class MassMarks {
    constructor(data: MassPoint[], options?: MassMarksOptions)
    setMap(map: Map | null): void
    clear(): void
  }

  // ---------- 图层 ----------

  interface TileLayerOptions {
    opacity?: number
    zIndex?: number
  }

  class TileLayer {
    constructor(options?: TileLayerOptions)
  }

  interface TrafficOptions extends TileLayerOptions {
    /** 是否自动刷新路况，默认 false */
    autoRefresh?: boolean
    /** 自动刷新间隔（秒），默认 180 */
    interval?: number
  }

  namespace TileLayer {
    class Satellite extends TileLayer {}
    class RoadNet extends TileLayer {}
    /** 实时路况图层（2.0 核心自带，不是插件；AMap.Traffic 是 1.4 的旧名，运行时不存在） */
    class Traffic extends TileLayer {
      constructor(options?: TrafficOptions)
      show(): void
      hide(): void
    }
  }

  // ---------- 控件 ----------

  class ToolBar {
    constructor(options?: ControlConfig)
  }

  class Scale {
    constructor(options?: ControlConfig)
  }

  class ControlBar {
    constructor(options?: ControlConfig)
  }

  class MapType {
    constructor(options?: ControlConfig)
  }

  // ---------- 插件 ----------

  interface PlaceSearchOptions {
    /** 限定城市，提高准确性 */
    city?: string
    /** 是否严格限城市 */
    citylimit?: boolean
    /** 每页结果数 */
    pageSize?: number
    /** 页码 */
    pageIndex?: number
    /** 结果列表容器 DOM 的 id（可选，自动生成可点击列表） */
    panel?: string
    /** 传入地图后，结果会自动标点 */
    map?: Map | null
  }

  class PlaceSearch {
    constructor(options?: PlaceSearchOptions)
    search(keyword: string, callback: (status: string, result: any) => void): void
    searchInBound(
      keyword: string,
      bounds: unknown,
      callback: (status: string, result: any) => void,
    ): void
    searchNearBy(
      keyword: string,
      center: [number, number] | LngLat,
      radius: number,
      callback: (status: string, result: any) => void,
    ): void
    clear(): void
  }

  interface AutoCompleteOptions {
    /** 绑定输入框 DOM id */
    input?: string
    /** 限定搜索城市，不传则全国范围 */
    city?: string
    /** 是否强制限定在 city 内 */
    citylimit?: boolean
  }

  class AutoComplete {
    constructor(options?: AutoCompleteOptions)
    /** 编程式触发联想查询（不走输入框） */
    search(keyword: string, callback: (status: string, result: any) => void): void
    on(event: string, handler: (event: any) => void): void
  }

  interface GeocoderOptions {
    /** 可限城市提高准确率 */
    city?: string
  }

  class Geocoder {
    constructor(options?: GeocoderOptions)
    /** 地址 → 经纬度（正地理编码） */
    getLocation(address: string, callback: (status: string, result: any) => void): void
    /** 经纬度 → 地址（逆地理编码） */
    getAddress(location: [number, number] | LngLat, callback: (status: string, result: any) => void): void
  }

  interface DrivingOptions {
    /** 传入地图后，自动在地图上画路线 */
    map?: Map | null
  }

  class Driving {
    constructor(options?: DrivingOptions)
    search(
      origin: [number, number] | string,
      destination: [number, number] | string,
      callback: (status: string, result: any) => void,
    ): void
  }

  class Transfer {
    constructor(options?: DrivingOptions)
    search(
      origin: [number, number] | string,
      destination: [number, number] | string,
      callback: (status: string, result: any) => void,
    ): void
  }

  class Walking {
    constructor(options?: DrivingOptions)
    search(
      origin: [number, number] | string,
      destination: [number, number] | string,
      callback: (status: string, result: any) => void,
    ): void
  }

  class Riding {
    constructor(options?: DrivingOptions)
    search(
      origin: [number, number] | string,
      destination: [number, number] | string,
      callback: (status: string, result: any) => void,
    ): void
  }

  interface GeolocationOptions {
    /** 高精度（优先浏览器定位） */
    enableHighAccuracy?: boolean
    /** 超时（毫秒） */
    timeout?: number
    /** 是否使用缓存结果 */
    maximumAge?: number
  }

  class Geolocation {
    constructor(options?: GeolocationOptions)
    getCurrentPosition(callback: (status: string, result: any) => void): void
  }

  interface MarkerClusterOptions {
    /** 聚合计算网格大小 */
    gridSize?: number
    renderMarker?: (ctx: any) => void
    renderClusterMarker?: (ctx: any) => void
  }

  class MarkerCluster {
    constructor(map: Map | null, points: MassPoint[], options?: MarkerClusterOptions)
    setData(points: MassPoint[]): void
  }
}

declare interface Window {
  AMap: typeof AMap
  _AMapSecurityConfig?: {
    securityJsCode: string
  }
}
