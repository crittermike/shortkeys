import gulp from 'gulp'
import { colors, log } from 'gulp-util'
import zip from 'gulp-zip'
import packageDetails from '../package.json'
import args from './lib/args'

function getPackFileType () {
  switch (args.vendor) {
    case 'firefox':
      return '.xpi'
    case 'opera':
      return '.crx'
    default:
      return '.zip'
  }
}

gulp.task('pack', ['build'], () => {
  let name = packageDetails.name
  let version = packageDetails.version
  let filetype = getPackFileType()
  let filename = `${name}-${version}-${args.vendor}${filetype}`
  return gulp.src(`dist/${args.vendor}/**/*`)
    .pipe(zip(filename))
    .pipe(gulp.dest('./packages'))
    .on('end', () => {
      let distStyled = colors.magenta(`dist/${args.vendor}`)
      let filenameStyled = colors.magenta(`./packages/${filename}`)
      log(`Packed ${distStyled} to ${filenameStyled}`)
    })
})
