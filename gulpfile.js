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
    connect = require('gulp-connect'),
    spritesmith = require('gulp.spritesmith'),
    imagemin = require('gulp-imagemin'),
    mergeStream = require('merge-stream'),
    cleanCss = require('gulp-clean-css');

const srcRoot = 'src/';
const distRoot = 'dist/';
const tmpRoot = '.tmp/';
const sassStaticInclRoot = srcRoot + 'sass/static-incl';
const pngSpriteFileName = 'sprite.png';
const allImgsBaseGlob = '**/*.{png,jpg,gif}';
const paths = {
    rootSass: srcRoot + 'sass/site.scss',
    sass: srcRoot + 'sass/**/*.scss',
    html: srcRoot + '**/*.html',
    pngSprite: 'src/img/sprite/png/**/*.png',
    pngSpriteDest: tmpRoot + 'img/',
    pngSpriteSassDest: sassStaticInclRoot
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

    var sources = gulp.src([paths.sass].concat(['!' + paths.rootSass, `${sassStaticInclRoot}**/*.scss`]), {
        read: false
    });

    return target.pipe(inject(sources, {
        relative: true,
        starttag: '// inject:{{ext}}',
        endtag: '// endinject',
    }))
        .pipe(gulp.dest(f => f.base));
});

gulp.task('sprite:png', function () {
    var spriteData =
        gulp.src(paths.pngSprite)
            .pipe(spritesmith({
                imgName: pngSpriteFileName,
                cssFormat: 'scss',
                cssName: '_png-sprite.scss',
                cssVarMap: function (sprite) {
                    sprite.name = 'sprite-' + sprite.name
                },
                padding: 2,
                imgPath: '/img/' + pngSpriteFileName
            }));

    spriteData.img
        .pipe(gulp.dest(paths.pngSpriteDest));

    spriteData.css
        .pipe(gulp.dest(paths.pngSpriteSassDest));
});

gulp.task('clean', function () {
    return del([
        distRoot,
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
    gulp.watch(paths.pngSprite, function (event) {
        gulp.start('sprite:png');
    });
});

gulp.task('build:main', gulpSequence('sprite:png', 'css'));
gulp.task('build:post', () => {
    let assetsFilter = filter(['**/*', '!**/*.html'], { restore: true, dot: true });
    let htmlFilter = filter(['**/*.html'], { restore: true });
    let cssFilter = filter(['**/*.css'], { restore: true });
    let imgFilter = filter([allImgsBaseGlob], { restore: true, dot: true });

    return mergeStream(gulp.src([paths.html, srcRoot + allImgsBaseGlob, '!' + paths.pngSprite], { base: 'src' }),
        gulp.src(paths.pngSpriteDest + pngSpriteFileName, { passthrough: true, base: '.tmp' }))
        .pipe(htmlFilter)
        .pipe(useref())
        .pipe(htmlFilter.restore)
        .pipe(cssFilter)
        .pipe(cleanCss({
            processImport: false
        }))
        .pipe(cssFilter.restore)        
        .pipe(imgFilter)
        .pipe(imagemin())
        .pipe(imgFilter.restore)             
        .pipe(assetsFilter)
        .pipe(rev())
        .pipe(assetsFilter.restore)
        .pipe(revReplace({
            replaceInExtensions: ['.html', '.css']
        }))
        .pipe(gulp.dest(distRoot));
});

gulp.task('build', gulpSequence('clean', 'build:main', 'build:post'));

gulp.task('serve', function () {
    connect.server({
        root: ['src', '.tmp'],
        livereload: true
    });
});

gulp.task('serve:dist', function () {
    connect.server({
        root: ['dist']
    });
});

gulp.task('default', gulpSequence('build:main', 'serve', 'watch'));
