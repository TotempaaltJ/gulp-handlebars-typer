# Handlebars Typescript Typer
This is a fairly simple gulp plugin to read a file of compiled Handlebars
templates. It doesn't support a lot of options (yet?) so it's fairly
simplisitic and it requires you to do things in a very specific way.


## So how do I use it?
Here's an example gulp script showing how I compile my templates:

    var tplPath = 'path/to/templates';

    gulp.task('handlebars', function() {
        return gulp.src(['./' + tplPath + '/**/*.hbs',
                         '!./' + tplPath + '/partials/*.hbs'])
            .pipe(handlebars())
            .pipe(wrap('Handlebars.template(<%= contents %>)'))
            .pipe(declare({
                root: 'module.exports',
                noRedeclare: true,
                processName: function(filePath) {
                    return declare.processNameByPath(
                        filePath.replace(tplPath + '/', '')
                    );
                }
            }))
            .pipe(concat('hbs.js'))
            .pipe(wrap('var Handlebars = require("handlebars");\n<%= contents %>'))

            .on('error', function(err) {
                gutil.log(gutil.colors.red('Typer Error:'), err.message);
            })
            .pipe(gulp.dest('./' + tplPath))
            .pipe(typer('hbs.d.ts'))
            .pipe(gulp.dest('./' + tplPath));
    });


## So what's it do?
Now I have a file called `hbs.js` with my compiled templates, and a file called
`hbs.d.ts` with a very simple definition for them. For a template structure
looking like this:

    .
    ├── index.hbs
    ├── test
    │   └── test2.hbs
    └── test.hbs

I get a typing definitions file that looks like this:

    interface Template {
        (data?: any): string,
    }

    interface HbsHierarchy {
        index: Template;
        test: {
            (): Template;
            test2: Template;

        }

    }

    declare module "hbs.js" {
        export var hbs: HbsHierarchy;
        export default hbs;
    }

Which, admittedly, is very simplistic. And it only targets ES6. And there's
some other flaws with it, probably, but it works for at least determining
whether or not a template actually exists at compile time.
