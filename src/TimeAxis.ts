import { Canvas, Image, Line } from '@antv/g'
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
    dragEnd: (t: Date) => void
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
    canvas.appendChild(this.startMark)
    canvas.appendChild(this.endMark)
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
      const endX = this.calculateEndTimeX()
      const startX = this.calculateStartTimeX()
      if (leftX === undefined) return
      const tX: number = e.clientX - leftX
      if (this.cursorState === 'normal') {
        if (tX < 0 && startX === undefined) {
          this.cursorState = 'back'
          window.requestAnimationFrame((t) => this.moveBackGround(t))
        } else if (tX > this.option.width && endX === undefined) {
          this.cursorState = 'forward'
          window.requestAnimationFrame((t) => this.moveBackGround(t))
        }
      }
      if (tX > 0 && tX < this.option.width) {
        this.cursorState = 'normal'
        this.preTime = undefined
      }
      let target = tX < 0 ? 0 : tX > this.option.width ? this.option.width : tX
      if (endX !== undefined && target > endX) target = endX
      if (startX !== undefined && target < startX) target = startX
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
  /**设置刻度的位置，无动画 */
  private setOffset(offset: number) {
    this.graduationList?.forEach((el) => {
      el.offsetX(offset)
    })
    this.bgOffset = (this.bgOffset + offset) % Graduation.totalWidth
  }
  /**设置刻度的位置，带动画 */
  private setOffsetAnimate(offset: number, time: number = 1000) {
    return new Promise<void>((resolve) => {
      const startT: number = performance.now()
      let doneOffset = 0
      const fun = () => {
        window.requestAnimationFrame((t) => {
          if (t < startT + time && time > 0) {
            const percent = (t - startT) / time
            const move = percent * offset - doneOffset
            this.setOffset(move)
            doneOffset += move
            fun()
          } else {
            this.setOffset(offset - doneOffset)
            resolve()
          }
        })
      }
      fun()
    })
  }
  /**设置指针的位置 */
  private setCursorX(targetX: number, time = 1000) {
    return new Promise<void>((resolve, reject) => {
      if (this.cursor === undefined) {
        reject()
        return
      }
      const startT = performance.now()
      const startX = Number(this.cursor.style.x)
      const fun = () => {
        window.requestAnimationFrame((t) => {
          if (this.cursor === undefined) {
            reject()
            return
          }
          if (t < startT + time && time > 0) {
            const percent = (t - startT) / time
            this.cursor.style.x = (targetX - startX) * percent + startX
            fun()
          } else {
            this.cursor.style.x = targetX
            resolve()
          }
        })
      }
      fun()
    })
  }
  private bgOffset = 0
  private moveBackGround(ms: number) {
    if (this.preTime === undefined) {
      this.preTime = ms
    }
    const endX = this.calculateEndTimeX()
    if (this.cursorState === 'forward' && endX !== undefined) {
      this.cursorState = 'normal'
    }
    const startX = this.calculateStartTimeX()
    if (this.cursorState === 'back' && startX !== undefined) {
      this.cursorState = 'normal'
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
  /**计算当前指针指示时间 */
  calculateCursorTime() {
    const cursorX = this.cursor?.style.x
    if (cursorX === undefined) return
    const cursorTime = this.calculateTimeByX(Number(cursorX))
    if (cursorTime === undefined) return
    this.observer.dispatch('timeUpdate', cursorTime.toDate())
    return cursorTime.toDate()
  }
  /**计算X对应的时间 */
  private calculateTimeByX(x: number) {
    const realX = x - this.bgOffset + Graduation.totalWidth / 2
    const firstGraduationTime = this.graduationList?.[0].date
    if (firstGraduationTime === undefined) return
    const cursorTime = firstGraduationTime.add((2 * realX) / Graduation.totalWidth, 'hour')
    return cursorTime
  }
  /**移动到指定时间 */
  async setTime(_target: Date, animationTime = 1000) {
    if (Number.isNaN(_target.valueOf())) return
    let target = _target
    if (this.endTime && target.valueOf() > this.endTime.valueOf()) {
      target = this.endTime
    }
    if (this.startTime && target.valueOf() < this.startTime.valueOf()) {
      target = this.startTime
    }
    const currentTime = this.calculateCursorTime()
    if (currentTime === undefined || this.cursor === undefined) return
    const cursorX = this.cursor.style.x
    if (cursorX === undefined) return
    const diff =
      ((currentTime.valueOf() - target.valueOf()) / (1000 * 60 * 60 * 2)) * Graduation.totalWidth
    const cursorMove = this.option.width / 2 - Number(cursorX)
    const bgMove = diff + cursorMove
    await Promise.allSettled([
      this.setOffsetAnimate(bgMove, animationTime),
      this.setCursorX(this.option.width / 2, animationTime)
    ])
    this.calculateCursorTime()
    return
  }
  private endTime?: Date
  /**设置时间边界end */
  setEndTime(endTime: Date) {
    if (Number.isNaN(endTime.valueOf())) return
    this.endTime = endTime
    const currentTime = this.calculateCursorTime()
    if (currentTime === undefined) return
    if (currentTime.valueOf() > endTime.valueOf()) this.setTime(endTime, 0)
    this.calculateEndTimeX()
  }
  private endMark = new Line({
    style: {
      x1: -10,
      x2: -10,
      y1: 15,
      y2: 40,
      stroke: 'red',
      lineWidth: 2
    }
  })
  private startMark = new Line({
    style: {
      x1: -10,
      x2: -10,
      y1: 15,
      y2: 40,
      stroke: 'red',
      lineWidth: 2
    }
  })
  /**计算结束时间的X位置 */
  private calculateEndTimeX() {
    if (this.endTime === undefined) return
    const endX = this.calculateXbyTime(this.endTime)
    this.endMark.style.x1 = this.endMark.style.x2 = endX ?? -10
    if (endX === undefined) return
    if (this.cursor && Number(this.cursor.style.x) > endX) {
      this.cursor.style.x = endX
      this.calculateCursorTime()
    }
    return endX
  }
  private startTime?: Date
  /**设置时间边界start */
  setStartTime(startTime: Date) {
    if (Number.isNaN(startTime.valueOf())) return
    this.startTime = startTime
    const currentTime = this.calculateCursorTime()
    if (currentTime === undefined) return
    if (currentTime.valueOf() < startTime.valueOf()) this.setTime(startTime, 0)
    this.calculateStartTimeX()
  }
  /**计算开始时间的X位置 */
  private calculateStartTimeX() {
    if (this.startTime === undefined) return
    const startX = this.calculateXbyTime(this.startTime)
    this.startMark.style.x1 = this.startMark.style.x2 = startX ?? -10
    if (startX === undefined) return
    if (this.cursor && Number(this.cursor.style.x) > startX) {
      this.cursor.style.x = startX
      this.calculateCursorTime()
    }
    return startX
  }
  /**计算时间所处的X */
  private calculateXbyTime(t: Date) {
    const startT = this.calculateTimeByX(0),
      endT = this.calculateTimeByX(this.option.width)
    if (startT === undefined || endT === undefined) return
    if (t.valueOf() >= startT.valueOf() && t.valueOf() <= endT.valueOf()) {
      const percent = (t.valueOf() - startT.valueOf()) / (endT.valueOf() - startT.valueOf())
      const x = percent * this.option.width
      return x
    }
  }
}
