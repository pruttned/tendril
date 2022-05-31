'use strict';

const del = require('del');
const print = require('gulp-print');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const inject = require('gulp-inject');
const rev = require('gulp-rev');
const revReplace = require('gulp-rev-replace');
const useref = require('gulp-useref');
const filter = require('gulp-filter');
const autoprefixer = require('gulp-autoprefixer');
const connect = require('gulp-connect');
const spritesmith = require('gulp.spritesmith');
const imagemin = require('gulp-imagemin');
const mergeStream = require('merge-stream');
const cleanCss = require('gulp-clean-css');
const realFavicon = require('gulp-real-favicon');
const fs = require('fs');
const gulp = require('gulp');

const { series, parallel } = gulp;

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
    pngSpriteSassDest: sassStaticInclRoot,
    faviconData: tmpRoot + 'faviconData.json',
    favicon: srcRoot + 'favicon.png',
    faviconDest: distRoot + 'favicon',
    copy: [`${srcRoot}CNAME`, `${srcRoot}**/*.svg`]
};

function isOnlyChange(event) {
    return event.type === 'changed';
}

const reloadHtml = function () {
    gulp.src(paths.html)
        .pipe(connect.reload());
};

const css = function () {
    return gulp.src([paths.rootSass])
        .pipe(sass().on('error', sass.logError))
        .pipe(autoprefixer({
            cascade: false
        }))
        .pipe(gulp.dest(tmpRoot))
        .pipe(connect.reload());
};

const injectSass = function () {
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
};

const spritePng = function () {
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

    return mergeStream(
        spriteData.img
            .pipe(gulp.dest(paths.pngSpriteDest)),
        spriteData.css
            .pipe(gulp.dest(paths.pngSpriteSassDest)));
};


const favicon = series([
    function (done) {
        realFavicon.generateFavicon({
            masterPicture: paths.favicon,
            dest: paths.faviconDest,
            iconsPath: '/favicon',
            design: {
                ios: {
                    pictureAspect: 'noChange',
                    assets: {
                        ios6AndPriorIcons: false,
                        ios7AndLaterIcons: false,
                        precomposedIcons: false,
                        declareOnlyDefaultIcon: true
                    }
                },
                desktopBrowser: {},
                windows: {
                    pictureAspect: 'noChange',
                    backgroundColor: '#da532c',
                    onConflict: 'override',
                    assets: {
                        windows80Ie10Tile: false,
                        windows10Ie11EdgeTiles: {
                            small: false,
                            medium: true,
                            big: false,
                            rectangle: false
                        }
                    }
                },
                androidChrome: {
                    pictureAspect: 'noChange',
                    themeColor: '#ffffff',
                    manifest: {
                        display: 'standalone',
                        orientation: 'notSet',
                        onConflict: 'override',
                        declared: true
                    },
                    assets: {
                        legacyIcon: false,
                        lowResolutionIcons: false
                    }
                },
                safariPinnedTab: {
                    pictureAspect: 'blackAndWhite',
                    threshold: 54.6875,
                    themeColor: '#5bbad5'
                }
            },
            settings: {
                scalingAlgorithm: 'Mitchell',
                errorOnImageTooSmall: false
            },
            markupFile: paths.faviconData
        }, function () {
            done();
        });
    },
    function () {
        return gulp.src([distRoot + '/index.html'])
            .pipe(realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(paths.faviconData)).favicon.html_code))
            .pipe(gulp.dest(distRoot));
    }
]);

const clean = function () {
    return del([
        distRoot,
        tmpRoot
    ]);
};

const watch = function () {
    gulp.watch(paths.sass, event => {
        if (isOnlyChange(event)) {
            gulp.start(css);
        } else {
            gulp.start(injectSass);
        }
    });
    gulp.watch(paths.html, () => {
        gulp.start(reloadHtml);
    });
    gulp.watch(paths.pngSprite, function (event) {
        gulp.start(spritePng);
    });
};

const buildMain = series(spritePng, css);
const buildPost = () => {
    let assetsFilter = filter(['**/*', '!**/*.html'], { restore: true, dot: true });
    let htmlFilter = filter(['**/*.html'], { restore: true });
    let cssFilter = filter(['**/*.css'], { restore: true });
    let imgFilter = filter([allImgsBaseGlob], { restore: true, dot: true });

    return mergeStream(gulp.src([paths.html, srcRoot + allImgsBaseGlob, '!' + paths.pngSprite, '!' + paths.favicon], { base: 'src' }),
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
};

const copy = () => gulp.src(paths.copy, { base: './src' })
    .pipe(gulp.dest(distRoot));

const build = series(clean, buildMain, buildPost, parallel(favicon, copy));

const serve = () => {
    connect.server({
        root: ['src', '.tmp'],
        livereload: true
    });
};

const serveDist = () => {
    connect.server({
        root: ['dist']
    });
};

gulp.task('default', series(buildMain, serve, watch));

module.exports = {
    build,
    serveDist
}