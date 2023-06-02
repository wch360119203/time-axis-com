import { Canvas, Image } from '@antv/g'
import { Renderer } from '@antv/g-canvas'
import { Graduation } from './ts'
import { defaultsDeep } from 'lodash'
import dayjs from 'dayjs'
import locateSvg from '@/assets/locate2.svg'
interface initOption {
  width: number
  endTime: Date
  strokeColor: string
}
export default class TimeAxis {
  canvas: Canvas
  option: initOption
  public ready: Promise<void>
  graduationList!: Graduation[]
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
      renderer: new Renderer()
    })
    this.canvas = canvas
    this.ready = (async () => {
      await canvas.ready
      this.graduationList = this.initGraduation()
      this.initCursor()
    })()
  }
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
        x: 150,
        y: 38,
        cursor: 'pointer'
      }
    })
    this.canvas.appendChild(cursor)
  }
}