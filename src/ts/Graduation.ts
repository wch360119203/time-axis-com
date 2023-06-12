import { CustomElement, Path, Text, type BaseStyleProps, type DisplayObjectConfig } from '@antv/g'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
interface GraduationStyleProps extends BaseStyleProps {
  x: number
  y: number
}
interface GraduationCfg {
  date: Dayjs
}
export default class Graduation extends CustomElement<GraduationStyleProps> {
  static totalWidth = 12 * 6
  static containHour = 2
  date: Dayjs
  private downText?: Text
  private upperText?: Text
  private path?: Path
  private offset = 0
  constructor(option: DisplayObjectConfig<GraduationStyleProps> & GraduationCfg) {
    const { date, ...config } = option
    super({ ...config, type: 'g' })
    this.date = date
    this.initPath()
    this.initText()
  }
  private getPathD(x: number, y: number) {
    let pathD = `M${x} ${y}h${Graduation.totalWidth}`
    for (let i = 1; i <= 12; i++) {
      if (i % 6 === 0) pathD += computeLongD(x, y, i)
      else {
        pathD += computeShortD(x, y, i)
      }
    }
    return pathD
  }
  private initPath() {
    const { x, y, ...baseStyle } = this.attributes
    const pathD = this.getPathD(x, y)
    this.path = new Path({
      style: {
        ...baseStyle,
        path: pathD
      }
    })
    this.appendChild(this.path)
  }
  private initText() {
    const downStr = this.date.format('H:mm')
    const cfg = {
      dx: Graduation.totalWidth / 2,
      fill: this.attributes.stroke,
      textAlign: 'center'
    } as const
    this.downText = new Text({
      style: {
        ...cfg,
        text: downStr,
        dy: -10,
        fontStyle: 'italic',
        fontSize: 10
      }
    })

    this.appendChild(this.downText)
    if (this.date.hour() % 12 === 0) {
      const upperStr = this.date.format('M月D日')
      this.upperText = new Text({
        style: {
          ...cfg,
          text: upperStr,
          dy: -22,
          fontSize: 12
        }
      })
      this.appendChild(this.upperText)
    }
  }
  /**修改展示时间 */
  public updateDate(date: Dayjs) {
    this.date = date
    if (this.downText) {
      const downStr = this.date.format('H:mm')
      this.downText.style.text = downStr
    }
    if (date.hour() % 12 === 0) {
      if (!this.upperText) {
        const cfg = {
          dx: Graduation.totalWidth / 2,
          fill: this.attributes.stroke,
          textAlign: 'center'
        } as const
        this.upperText = new Text({
          style: {
            ...cfg,
            text: '',
            dy: -22,
            fontSize: 12
          }
        })
        this.appendChild(this.upperText)
      }
      this.upperText.style.text = this.date.format('M月D日')
    } else {
      if (this.upperText?.style.text) this.upperText.style.text = ''
    }
  }
  public offsetX(x: number) {
    const preOffset = this.offset
    this.offset += x
    if (Math.abs(this.offset) > Graduation.totalWidth) {
      const times = Math.trunc(this.offset / Graduation.totalWidth)
      this.updateDate(this.date.subtract(2 * times, 'hour'))
      this.offset = this.offset % Graduation.totalWidth
    }
    this.style.x = this.style.x - preOffset + this.offset
  }
}

function computeShortD(x: number, y: number, offset: number) {
  return ` M${x + offset * 6} ${y}v-5`
}
function computeLongD(x: number, y: number, offset: number) {
  return ` M${x + offset * 6} ${y}v-8`
}
