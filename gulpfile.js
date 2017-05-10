'use strict';

const
    gulp = require('gulp'),
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
    gulpSequence = require('gulp-sequence'),
    connect = require('gulp-connect');

const srcRoot = 'src/';
const destRoot = 'dest/';
const tmpRoot = '.tmp/';
const assetsRoot = 'assets/';
const paths = {
    rootSass: srcRoot + 'sass/site.scss',
    sass: srcRoot + 'sass/**/*.scss',
    html: srcRoot + '**/*.html'
};

function isOnlyChange(event) {
    return event.type === 'changed';
}

gulp.task('reload:html', function () {
    gulp.src(paths.html)
        .pipe(connect.reload());
});

gulp.task('css', function () {
    return gulp.src([paths.rootSass])
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(gulp.dest(tmpRoot))
        .pipe(connect.reload());
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
        destRoot,
        tmpRoot
    ]);
});

gulp.task('watch', function () {
    gulp.watch(paths.sass, event => {
        if (isOnlyChange(event)) {
            gulp.start('css');
        } else {
            gulp.start('inject:sass');
        }
    });
    gulp.watch(paths.html, () => {
        gulp.start('reload:html');
    });
});

gulp.task('build:main', ['css']);
gulp.task('build:post', () => {
    let assetsFilter = filter(['**/*', '!**/*.html'], { restore: true });

    return gulp.src(paths.html, { base: srcRoot })
        .pipe(useref())
        .pipe(assetsFilter)
        .pipe(rev())
        .pipe(assetsFilter.restore)
        .pipe(revReplace())
        .pipe(gulp.dest(destRoot));
});

gulp.task('build', gulpSequence('clean', 'build:main', 'build:post'));

gulp.task('serve', function () {
    connect.server({
        root: ['src', '.tmp'],
        livereload: true
    });
});

gulp.task('default', gulpSequence('serve', 'watch'));
