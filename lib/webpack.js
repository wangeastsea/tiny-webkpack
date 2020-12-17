const fs = require("fs")
const parser = require("@babel/parser")
const traverse = require("@babel/traverse").default
const path = require("path")
const { transformFromAst } = require("@babel/core")
module.exports = class Webpack {
    constructor(options){
        const { entry, output } = options
        this.entry = entry
        this.output = output
        this.modulesArr = []
    }
    run(){
        const info = this.analysis(this.entry)
        this.modulesArr.push(info)
        for(let i=0;i<this.modulesArr.length;i++) {
            const item = this.modulesArr[i]
            const { dependencies } = item;
            if(dependencies) {
                for(let j in dependencies){
                    this.modulesArr.push(this.analysis(dependencies[j]))
                }
            }
        }
        // console.log(this.modules)
        //数组结构转换
        const obj = {}
        this.modulesArr.forEach((item) => {
            obj[item.entryFile] = {
                dependencies:item.dependencies,
                code:item.code
            }
        })
        console.log('obj ===> ', obj)
        this.file(obj)
    }
    // module.exports = {
    //     entry: "./src/index.js",
    //     mode: "development",
    //     output: {
    //         path: path.resolve(__dirname, "./dist"),
    //         filename:"main.js"
    //     }
    // }
    /**
     * 
     * @param {*} entryFile 
     */
    analysis(entryFile){
        const conts = fs.readFileSync(entryFile,'utf-8')
        const ast = parser.parse(conts, {
            sourceType: "module"
            });
        const dependencies = {}
        traverse(ast,{
            ImportDeclaration({node}){
                const newPath = "./" + path.join(
                    path.dirname(entryFile),
                    node.source.value
                    )
                dependencies[node.source.value] = newPath
                console.log(dependencies)
            }
        })
        const {code} = transformFromAst(ast,null,{
            presets: ["@babel/preset-env"]
        })
        console.log('code', code)
        return {
            entryFile,
            dependencies,
            code
        }
    }
    // {
        //     "./src/index.js": {
        //         "dependencies": {
        //         "./export.js": "./src/export.js"
        //         },
        //         "code": "\"use strict\";\n\nvar _export = require(\"./export.js\");\n\n(0, _export.sayHi)(\"hfj\");\nconsole.log(\"hello webpack index\");"
        //         },
        //     "./src/export.js": {
        //         "dependencies": {},
        //         "code": "\"use strict\";\n\nObject.defineProperty(exports, \"__esModule\", {\n value: true\n});\nexports.sayHi = void 0;\n\nvar sayHi = function sayHi(params) {\n console.log(\"hello ~\" + params);\n};\n\nexports.sayHi = sayHi;"
        //     }
        // }
    file(code){
        // console.log(code)
        //生成bundle.js   =>./dist/main.js
        const filePath = path.join(this.output.path,this.output.filename)
        const newCode = JSON.stringify(code)
        const bundle = `(function(graph){
            function require(moduleId){
                function localRequire(relativePath){
                   return require(graph[moduleId].dependencies[relativePath]) 
                }
                var exports = {};
                (function(require,exports,code){
                    eval(code)
                })(localRequire,exports,graph[moduleId].code)
                return exports;
            }
            require('${this.entry}')
        })(${newCode})`
        fs.writeFileSync(filePath,bundle,'utf-8')
    }
}