/**
 * Bumping version number and tagging the repository with it.
 * Please read http://semver.org/
 *
 * You can use the commands
 *
 *     gulp patch     # makes v0.1.0 → v0.1.1
 *     gulp feature   # makes v0.1.1 → v0.2.0
 *     gulp release   # makes v0.2.1 → v1.0.0
 *
 * To bump the version numbers accordingly after you did a patch,
 * introduced a feature or made a backwards-incompatible release.
 */

import gulp from 'gulp'
import git from 'gulp-git'
import bump from 'gulp-bump'
import filter from 'gulp-filter'
import tagVersion from 'gulp-tag-version'

function inc (importance) {
  // get all the files to bump version in
  return gulp.src([
    'package.json',
    'app/manifest.json'
  ], {
    base: './'
  })
    // bump the version number in those files
    .pipe(bump({
      type: importance
    }))
    // save it back to filesystem
    .pipe(gulp.dest('./'))
    // commit the changed version number
    .pipe(git.commit('bump package version'))
    // read only one file to get the version number
    .pipe(filter('package.json'))
    // **tag it in the repository**
    .pipe(tagVersion())
}

gulp.task('patch', () => {
  return inc('patch')
})

gulp.task('feature', () => {
  return inc('minor')
})

gulp.task('release', () => {
  return inc('major')
})
