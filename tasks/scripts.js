import gulp from 'gulp'
import gulpif from 'gulp-if'
import { log, colors } from 'gulp-util'
import named from 'vinyl-named'
import webpack from 'webpack'
import gulpWebpack from 'webpack-stream'
import plumber from 'gulp-plumber'
import livereload from 'gulp-livereload'
import args from './lib/args'

const ENV = args.production ? 'production' : 'development'

gulp.task('scripts', (cb) => {
  return gulp.src('app/scripts/*.js')
    .pipe(plumber({
      // Webpack will log the errors
      errorHandler () {}
    }))
    .pipe(named())
    .pipe(gulpWebpack({
      devtool: args.sourcemaps ? 'inline-source-map' : false,
      watch: args.watch,
      plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': JSON.stringify(ENV),
          'process.env.VENDOR': JSON.stringify(args.vendor)
        })
      ].concat(args.production ? [
        new webpack.optimize.UglifyJsPlugin()
      ] : []),
      module: {
        rules: [{
          test: /\.js$/,
          loader: 'babel-loader'
        }]
      }
    },
    webpack,
    (err, stats) => {
      if (err) return
      log(`Finished '${colors.cyan('scripts')}'`, stats.toString({
        chunks: false,
        colors: true,
        cached: false,
        children: false
      }))
    }))
    .pipe(gulp.dest(`dist/${args.vendor}/scripts`))
    .pipe(gulpif(args.watch, livereload()))
})
