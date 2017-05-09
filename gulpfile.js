'use strict';

const gulp = require('gulp'),
    sass = require('gulp-sass'),
    concat = require('gulp-concat'),
    inject = require('gulp-inject'),
    autoprefixer = require('gulp-autoprefixer');

const srcRoot = 'src/';
const paths = {
    rootSass: srcRoot + 'sass/site.scss',
    sass: srcRoot + 'sass/**/*.scss',
    assetsDest: 'assets/',
};

function isOnlyChange(event) {
    return event.type === 'changed';
}

gulp.task('css', function () {
    gulp.src([paths.rootSass])
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(gulp.dest(paths.assetsDest));
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

gulp.task('watch', function () {
    gulp.watch(paths.sass, function (event) {
        if (isOnlyChange(event)) {
            gulp.start('css');
        } else {
            gulp.start('inject:sass');
        }
    });
});

gulp.task('build', ['css']);

