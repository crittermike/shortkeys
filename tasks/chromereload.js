import gulp from 'gulp'
import gutil from 'gulp-util'
import livereload from 'gulp-livereload'
import args from './lib/args'

// In order to make chromereload work you'll need to include
// the following line in your `scipts/background.js` file.
//
//    import 'chromereload/devonly';
//
// This will reload your extension everytime a file changes.
// If you just want to reload a specific context of your extension
// (e.g. `pages/options.html`) include the script in that context
// (e.g. `scripts/options.js`).
//
// Please note that you'll have to restart the gulp task if you
// create new file. We'll fix that when gulp 4 comes out.

gulp.task('chromereload', (cb) => {
  // This task runs only if the
  // watch argument is present!
  if (!args.watch) return cb()

  // Start livereload server
  livereload.listen({
    reloadPage: 'Extension',
    quiet: !args.verbose
  })

  gutil.log('Starting', gutil.colors.cyan('\'livereload-server\''))

  // The watching for javascript files is done by webpack
  // Check out ./tasks/scripts.js for further info.
  gulp.watch('app/manifest.json', ['manifest'])
  gulp.watch('app/styles/**/*.css', ['styles:css'])
  gulp.watch('app/styles/**/*.less', ['styles:less'])
  gulp.watch('app/styles/**/*.scss', ['styles:sass'])
  gulp.watch('app/pages/**/*.html', ['pages'])
  gulp.watch('app/_locales/**/*', ['locales'])
  gulp.watch('app/images/**/*', ['images'])
  gulp.watch('app/fonts/**/*.{woff,ttf,eot,svg}', ['fonts'])
})
