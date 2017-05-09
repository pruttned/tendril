'use strict';

const gulp = require('gulp'),
    del = require('del'),
    print = require('gulp-print'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    inject = require('gulp-inject'),
    rev = require('gulp-rev'),
    revReplace = require('gulp-rev-replace'),
    useref = require('gulp-useref'),
    filter = require('gulp-filter'),
    autoprefixer = require('gulp-autoprefixer'),
    gulpSequence = require('gulp-sequence');

const srcRoot = 'src/';
const buildRoot = '.tmp/';
const assetsRoot = 'assets/';
const paths = {
    rootSass: srcRoot + 'sass/site.scss',
    sass: srcRoot + 'sass/**/*.scss'
};

function isOnlyChange(event) {
    return event.type === 'changed';
}

gulp.task('css', function () {
    return gulp.src([paths.rootSass])
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(gulp.dest(buildRoot));
});

gulp.task('inject:sass', function () {
    var target = gulp.src(paths.rootSass);

    var sources = gulp.src([paths.sass].concat(['!' + paths.rootSass]), {
        read: false
    });

    return target.pipe(inject(sources, {
        relative: true,
        starttag: '// inject:{{ext}}',
        endtag: '// endinject',
    }))
        .pipe(gulp.dest(f => f.base));
});

gulp.task('clean', function () {
    return del([
        assetsRoot,
        buildRoot
    ]);
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, function (event) {
        if (isOnlyChange(event)) {
            gulp.start('css');
        } else {
            gulp.start('inject:sass');
        }
    });
});

gulp.task('copy', () => {
    gulp.src(srcRoot + '_includes/**/*')
        .pipe(print())
        .pipe(gulp.dest('_includes'));
});

gulp.task('build:main', ['css', 'copy']);
gulp.task('build:post', () => {
    let cssFilter = filter('**/*.css', { restore: true });
    let htmlFilter = filter('**/*.html', { restore: true });
    let assetsFilter = filter(['**/*', '!**/*.html'], { restore: true });

    return gulp.src('_includes/' + '*.html', {base: '.'})
        .pipe(useref())
        .pipe(assetsFilter)
        .pipe(rev())
        .pipe(assetsFilter.restore)
        .pipe(revReplace())
        .pipe(gulp.dest('.'));
});

gulp.task('build', gulpSequence('clean', 'build:main', 'build:post'));
