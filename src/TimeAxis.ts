import { Canvas, Image } from '@antv/g'
import { Renderer as CanvasRenderer } from '@antv/g-canvas'
import { Graduation } from './ts'
import { defaultsDeep } from 'lodash'
import dayjs from 'dayjs'
import locateSvg from '@/assets/locate2.svg'
import { Observer } from '@wuch96/utils'
interface initOption {
  width: number
  endTime: Date
  strokeColor: string
}
export default class TimeAxis {
  canvas: Canvas
  ready: Promise<void>
  observer = new Observer<{
    timeUpdate: (t: Date) => void
  }>()
  private option: initOption
  private graduationList?: Graduation[]
  private cursor?: Image
  private cursorState: 'normal' | 'back' | 'forward' = 'normal'
  private preTime?: number
  constructor(container: HTMLElement | string, option?: Partial<initOption>) {
    const dom = typeof container === 'string' ? document.getElementById(container) : container
    if (dom === null) throw new Error('未获取到容器')
    const dftOpt: initOption = { width: 1000, endTime: new Date(), strokeColor: 'white' }
    this.option = defaultsDeep(option, dftOpt)
    const canvas = new Canvas({
      container,
      width: this.option.width,
      height: 40,
      background: 'grey',
      renderer: new CanvasRenderer()
    })
    this.canvas = canvas
    this.ready = (async () => {
      await canvas.ready
      this.graduationList = this.initGraduation()
      this.cursor = this.initCursor()
    })()
  }
  /**初始化刻度线 */
  private initGraduation() {
    const width = this.option.width
    const times = Math.ceil(width / Graduation.totalWidth) + 2
    let startDate = dayjs(this.option.endTime).startOf('hour')
    if (startDate.hour() % 2 !== 0) {
      startDate = startDate.subtract(1, 'hour')
    }
    const start = startDate.subtract(Math.floor((times - 1) / 2 - 1) * 2, 'hour')
    const list = Array<Graduation>()
    for (let i = -1; i < times; i++) {
      const graduation = new Graduation({
        date: start.add(2 * i, 'hour'),
        style: {
          x: i * Graduation.totalWidth,
          y: 39,
          stroke: this.option.strokeColor,
          anchor: [0, 1]
        }
      })
      list.push(graduation)
      this.canvas.appendChild(graduation)
    }
    return list
  }
  private initCursor() {
    const cursor = new Image({
      style: {
        img: locateSvg,
        anchor: [0.5, 1],
        width: 20,
        height: 32,
        x: this.option.width / 2,
        y: 38,
        cursor: 'pointer'
      }
    })
    this.canvas.appendChild(cursor)
    let leftX: number
    const moveFn = (e: PointerEvent) => {
      if (leftX === undefined) return
      const tX: number = e.clientX - leftX
      if (this.cursorState === 'normal') {
        if (tX < 0) {
          this.cursorState = 'back'
          window.requestAnimationFrame((t) => this.moveBackGround(t))
        } else if (tX > this.option.width) {
          this.cursorState = 'forward'
          window.requestAnimationFrame((t) => this.moveBackGround(t))
        }
      }
      if (tX > 0 && tX < this.option.width) {
        this.cursorState = 'normal'
        this.preTime = undefined
      }
      const target = tX < 0 ? 0 : tX > this.option.width ? this.option.width : tX
      cursor.style.x = target
      this.calculateCursorTime()
    }
    cursor.addEventListener('pointerdown', () => {
      leftX = this.canvas.document.documentElement.getBoundingClientRect().x
      document.body.addEventListener('pointermove', moveFn)
      document.body.addEventListener(
        'pointerup',
        () => {
          document.body.removeEventListener('pointermove', moveFn)
          this.cursorState = 'normal'
          this.preTime = undefined
        },
        { once: true }
      )
    })
    return cursor
  }
  private setOffset(offset: number) {
    this.graduationList?.forEach((el) => {
      el.offsetX(offset)
    })
    this.bgOffset = (this.bgOffset + offset) % Graduation.totalWidth
  }
  private bgOffset = 0
  public moveBackGround(ms: number) {
    if (this.preTime === undefined) {
      this.preTime = ms
    }
    const diff = ms - this.preTime
    this.preTime = ms
    if (this.cursorState === 'normal') {
      this.preTime = undefined
      return
    }
    let offset: number
    if (this.cursorState === 'forward') {
      offset = -diff / 2
    } else {
      offset = diff / 2
    }
    this.setOffset(offset)
    this.calculateCursorTime()
    window.requestAnimationFrame((t) => this.moveBackGround(t))
  }
  calculateCursorTime() {
    const cursorX = this.cursor?.style.x
    if (cursorX === undefined) return
    const realX = Number(cursorX) - this.bgOffset + Graduation.totalWidth / 2
    const firstGraduationTime = this.graduationList?.[0].date
    if (firstGraduationTime === undefined) return
    const cursorTime = firstGraduationTime.add((2 * realX) / Graduation.totalWidth, 'hour')
    this.observer.dispatch('timeUpdate', cursorTime.toDate())
    return cursorTime.toDate()
  }
  moveToTime(time: Date) {
    const currentTime = this.calculateCursorTime()
    if (currentTime === undefined || this.cursor === undefined) return
    const cursorX = this.cursor.style.x
    if (cursorX === undefined) return
    const diff =
      ((currentTime.valueOf() - time.valueOf()) / (1000 * 60 * 60 * 2)) * Graduation.totalWidth
    const cursorMove = this.option.width / 2 - Number(cursorX)
    const bgMove = diff + cursorMove
    this.setOffset(bgMove)
    this.cursor.style.x = this.option.width / 2
    this.calculateCursorTime()
  }
}
