import gulp from 'gulp'
import gulpif from 'gulp-if'
import imagemin from 'gulp-imagemin'
import livereload from 'gulp-livereload'
import args from './lib/args'

gulp.task('images', () => {
  return gulp.src('app/images/**/*')
    .pipe(gulpif(args.production, imagemin()))
    .pipe(gulp.dest(`dist/${args.vendor}/images`))
    .pipe(gulpif(args.watch, livereload()))
})
