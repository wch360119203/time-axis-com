import { CustomElement, Path, Text, type BaseStyleProps, type DisplayObjectConfig } from '@antv/g'
import type { Dayjs } from 'dayjs'
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
  constructor(option: DisplayObjectConfig<GraduationStyleProps> & GraduationCfg) {
    const { date, ...config } = option
    super({ ...config, type: 'g' })
    this.date = date
    this.initPath()
    this.initText()
  }
  private initPath() {
    const { x, y, ...baseStyle } = this.attributes
    let pathD = `M${x} ${y}h${Graduation.totalWidth}`
    for (let i = 1; i <= 12; i++) {
      if (i % 6 === 0) pathD += computeLongD(x, y, i)
      else {
        pathD += computeShortD(x, y, i)
      }
    }
    const path = new Path({
      style: {
        ...baseStyle,
        d: pathD
      }
    })
    this.appendChild(path)
  }
  private initText() {
    const downStr = this.date.format('H:mm')
    const cfg = {
      dx: Graduation.totalWidth / 2,
      fill: this.attributes.stroke,
      textAlign: 'center'
    } as const
    const downText = new Text({
      style: {
        ...cfg,
        text: downStr,
        dy: -10,
        fontStyle: 'italic',
        fontSize: 10
      }
    })
    this.appendChild(downText)
    if (this.date.hour() % 12 === 0) {
      const upperStr = this.date.format('M月D日')
      const upperText = new Text({
        style: {
          ...cfg,
          text: upperStr,
          dy: -22,
          fontSize: 12
        }
      })
      this.appendChild(upperText)
    }
  }
}
function computeShortD(x: number, y: number, offset: number) {
  return ` M${x + offset * 6} ${y}v-5`
}
function computeLongD(x: number, y: number, offset: number) {
  return ` M${x + offset * 6} ${y}v-8`
}
