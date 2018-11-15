'use strict';
//  @author Den Piaterenkov
//  Основная информация: https://habr.com/post/250569/
//  Дополнительная информация: https://learn.javascript.ru/screencast/gulp
//  Адаптировано для использования с gulp v.4+
//  Повторяемость кода используется для улучшения читаемости
//
//
//  Синтаксис rigger      Javascript:    //= includes/test
//                              HTML:    //= templates/includes.html
//                               CSS:    /*= includes/test */
//                      CoffeeScript:    #= includes/test
//                Directory Includes:    //= ../includes/testdir
//
//
// Для оладки путей и контроля работы плагинов, пример:
// gulp.task('default', function(){
//     return gulp.src('app/**/*.*')
//     .on('data', function(file){
//         console.log({
//             contents:   file.contents, // содержимое файла в бинарном виде
//             mypath:     file.mypath, // полный путь к файлу
//             cwd:        file.cwd, // текущая директория, из которой запущена команда
//             base:       file.base, // от 'cwd' до маски файлов
//             // mypath component helpers
//             relative:   file.relative, // текущий файл, соответствующей маске файлов и директорий
//             dirname:    file.dirname, // путь 'cwd + base + relative'
//             basename:   file.basename, // все файлы в 'dirname'
//             stem:       file.stem, // имя текущего файла без расширения
//             extname:    file.extname // расширение текущего файла
//         })
//     })
// });


const gulp          = require('gulp'); // Подключаем Gulp
const gutil         = require('gulp-util');
const del           = require('del'); // Подключаем библиотеку для удаления файлов и папок
const rename        = require('gulp-rename'); // Подключаем библиотеку для переименования файлов
const path          = require('path'); // Модуль для преобразования пути из относительного в абсолютный
const rigger        = require('gulp-rigger'); // Подключаем библиотеку для сборки итогового файла из шаблонов
const browserSync   = require('browser-sync'); // Подключаем Browser Sync

// Debug
const debug         = require('gulp-debug'); // Удобный дебаггер gulp
const notify        = require('gulp-notify'); // Плагин для сигнализации об ошибках
const plumber       = require('gulp-plumber'); // Отлавливаем ошибки, не срывая потока gulp.watch

// Optimization
const gulpIf        = require('gulp-if'); // Добавление сокращенных условий
const cached        = require('gulp-cached'); // Модуль запоминает файлы и повторно не пропускает
const newer         = require('gulp-newer'); // Плагин, проверяющий файл на новизну
const remember      = require('gulp-remember'); // Плагин передает недостающие для пересборки файлы

// CSS
const sass          = require('gulp-sass'); //Подключаем Sass пакет
const prefixer      = require('gulp-autoprefixer');// Подключаем библиотеку для автоматического добавления префиксов CSS
const sourcemaps    = require('gulp-sourcemaps'); // Подключаем библиотеку - помогает в отладке CSS, JS
const cssmin        = require('gulp-clean-css'); // Подключаем пакет для минификации CSS

// JS
const uglify        = require('gulp-uglify'); // Подключаем gulp-uglify (для сжатия JS)

// IMG
const imagemin      = require('gulp-imagemin'); // Подключаем библиотеку для работы с изображениями
const pngquant      = require('imagemin-pngquant'); // Подключаем библиотеку для работы с png

// const concat       = require('gulp-concat'); // Подключаем gulp-concat (для конкатенации файлов)
// const watch        = require('gulp-watch'); // Замена встроенного watch
// const cache          = require('gulp-cache'); // Подключаем библиотеку кеширования
                    
const bsreload      = browserSync.reload; // сокращяем для удобства

// Для подготовки сборки в продакшн в командной строке пишется 'NODE_ENV=production gulp'
var isDevelopment = !process.env.NODE_ENV || process.env.NODE_ENV == 'development';


var mypath = {
    build: { //Тут мы укажем куда складывать готовые после сборки файлы
        html: 'build/',
        js: 'build/js/',
        css: 'build/css/',
        img: 'build/img/',
        assets: 'build/'
    },
    src: { //Пути откуда брать исходники
        html: 'app/*.html', //Синтаксис *.html говорит gulp что мы хотим взять все файлы с расширением .html
        js: 'app/js/*.js',
        style: 'app/sass/styles.scss',
        img: 'app/assets/img/**/*.*', //Синтаксис **/*.* означает - взять все файлы всех расширений из папки и из вложенных каталогов
        assets: 'app/assets/**/*.*'
    },
    watch: { //Тут мы укажем, за изменением каких файлов мы хотим наблюдать
        html: 'app/**/*.html',
        js: 'app/**/*.js',
        style: 'app/**/*.scss',
        img: 'app/assets/img/**/*.*',
        assets: 'app/assets/**/*.*'
    },
    clean: 'build/'
};

 // конфигурация вебсервера
var config = {
    server: {
        baseDir: "build"
    },
    snippetOptions: {
      ignorePaths: "template/*.html"
    },
    tunnel: false, // Заменить на true если нужен туннель
    host: 'localhost',
    port: 9000,
    logPrefix: "Den_Piaterenkov"
};



 // Таск вебсервера livebsreload
gulp.task('webserver', gulp.parallel(function () {
    browserSync(config);
}));


// Таск для очистки папки
gulp.task('del', gulp.parallel( function (callback) {
    del(mypath.clean);
}));


// Таск для компиляции HTML файлов
gulp.task('html:build', gulp.series(function () {
    return gulp.src(mypath.src.html)
        .pipe(debug({title: 'html'})) // Смотрим какие файлы обрабатываются
        .pipe(newer('html:build')) // Проверить что файл новый, иначе завершить
        .pipe(plumber()) // Чтоб при ошибках плагинов не падал gulp.watch
        .pipe(rigger()) // Собираем из шаблона
        .pipe(plumber.stop())
        .pipe(cached('html_build')) // не пропускает неизмененные файлы
        .pipe(remember('html:build')) // Если нужно передать недостающие файлы для сборки
        .pipe(gulp.dest(mypath.build.html))
        .pipe(bsreload({stream: true}));
}));


// Таск для компиляции JavaScript файлов
gulp.task('js:build', gulp.series(function () {
    return gulp.src(mypath.src.js)
        .pipe(debug({title: 'js'})) // Смотрим какие файлы обрабатываются
        .pipe(newer('js:build')) // Проверить что файл новый, иначе завершить
        .pipe(plumber()) // Чтоб при ошибках плагинов не падал gulp.watch
        .pipe(rigger()) // Собираем из шаблона
        .pipe(plumber.stop())
        .pipe(cached('js_build')) // не пропускает неизмененные файлы
        .pipe(gulpIf(isDevelopment, sourcemaps.init())) // Для отладки в браузере
        .pipe(uglify())
        .pipe(remember('js:build')) // Если нужно передать недостающие файлы для сборки
        .pipe(gulpIf(isDevelopment, sourcemaps.write())) // Для отладки в браузере
        .pipe(gulp.dest(mypath.build.js))
        .pipe(bsreload({stream: true}))
}));


// Таск для компиляции CSS
gulp.task('style:build', gulp.series(function () {
    return gulp.src(mypath.src.style)
        .pipe(debug({title: 'style'})) // Смотрим какие файлы обрабатываются
        .pipe(newer('style:build')) // Проверить что файл новый, иначе завершить
        .pipe(gulpIf(isDevelopment, sourcemaps.init())) // Для отладки в браузере
        .pipe(sass({
            sourceMap: true,
            errLogToConsole: true
        }))
        .on('error', notify.onError(function(err) {
          return {
            title: 'Sass',
            message: err.message
          };
        }))
        .pipe(debug({title: 'sass'})) // Смотрим какие файлы обрабатываются
        .pipe(cached('style_build')) // не пропускает неизмененные файлы
        .pipe(prefixer({ browsers: ['last 15 versions'] })) // Добавляем префиксы
        .pipe(remember('style:build')) // Если нужно передать недостающие файлы для сборки
        .pipe(cssmin()) // !!!Минифакацию не отключать!!! - производит конкатенацию по @import после sass
        .on('error', notify.onError(function(err) {
          return {
            title: 'CSSmin',
            message: err.message
          };
        }))
        .pipe(gulpIf(isDevelopment, sourcemaps.write())) // Для отладки в браузере
        .pipe(gulp.dest(mypath.build.css))
        .pipe(bsreload({stream: true}))
}));


// Таск для обработки изображений
gulp.task('image:build', gulp.parallel(function () {
    // {since: gulp.lastRun('image:build')} проверяет, что файл изменен с последнго запуска
    // Если файл не менялся, то поток дальше не передается
    return gulp.src(mypath.src.img, {since: gulp.lastRun('image:build')})
        .pipe(debug({title: 'image'})) // Смотрим какие файлы обрабатываются
        .pipe(newer('image:build')) // Проверить что файл новый, иначе завершить
        // .pipe(imagemin({ // Преобразование изображений
        //     progressive: true,
        //     svgoPlugins: [{removeViewBox: false}],
        //     use: [pngquant()],
        //     interlaced: true
        // }))
        .pipe(gulp.dest(mypath.build.img))
        .pipe(bsreload({stream: true}))
}));


// Таск для копирования папки assets
gulp.task('assets:build', gulp.parallel(function() {
    return gulp.src(mypath.src.assets)
        .pipe(debug({title: 'assets'})) // Смотрим какие файлы обрабатываются
        .pipe(newer('assets:build')) // Проверить что файл новый, иначе завершить
        .pipe(gulp.dest(mypath.build.assets))
}));


gulp.task('build', gulp.parallel( // Запускать параллельно то, что не создает зависимостей
    'html:build',
    'js:build',
    'style:build',
    'assets:build',
    'image:build'
));



//-- Begin 'watch' --//
gulp.task('watch', function() {

// Наблюдение за html
    gulp.watch(mypath.watch.html, gulp.series('html:build'))

      // При удалении файлов очистить кэш
      .on('unlink', function(filepath){
        remember.forget('html:build', path.resolve(filepath))
        .on('error', notify.onError(function(err) {
          return {
            title: 'Remember forget',
            message: err.message
          };
        }))
        ;

        delete cached.caches.html_cache[path.resolve(filepath)]
        .on('error', notify.onError(function(err) {
          return {
            title: 'Cached delete',
            message: err.message
          };
        }));
    });


// Наблюдение за scss
    gulp.watch(mypath.watch.style, gulp.series('style:build'))

      // При удалении файлов очистить кэш
      .on('unlink', function(filepath){
        remember.forget('style:build', path.resolve(filepath))
        .on('error', notify.onError(function(err) {
          return {
            title: 'Remember forget',
            message: err.message
          };
        }))
        ;

        delete cached.caches.style_cache[path.resolve(filepath)]
        .on('error', notify.onError(function(err) {
          return {
            title: 'Cached delete',
            message: err.message
          };
        }));
    });


// Наблюдение за js
    gulp.watch(mypath.watch.js, gulp.series('js:build'))

      // При удалении файлов очистить кэш
      .on('unlink', function(filepath){
        remember.forget('js:build', path.resolve(filepath))
        .on('error', notify.onError(function(err) {
          return {
            title: 'Remember forget',
            message: err.message
          };
        }))
        ;

        delete cached.caches.js_cache[path.resolve(filepath)]
        .on('error', notify.onError(function(err) {
          return {
            title: 'Cached delete',
            message: err.message
          };
        }));
    });


// Наблюдение за IMG
    gulp.watch(mypath.watch.image, gulp.series('image:build'));


// Наблюдение за ASSETS
    gulp.watch(mypath.watch.assets, gulp.series('assets:build'));

});
//-- End 'watch' --//



// Запуск Gulp по умолчанию.
// Всегда запускать параллельно 'webserver' и 'watch',
// но лишь после выполнения 'build'!
gulp.task('default', gulp.series('build', gulp.parallel('webserver', 'watch')));