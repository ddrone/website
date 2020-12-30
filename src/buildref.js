const {gatherMany} = require("gettypes")
const {build, browserImports} = require("builddocs")
const {join} = require("path")
const {existsSync, readdirSync, readFileSync} = require("fs")

let root = join(__dirname, "../..")
const {loadPackages, core} = require("../../bin/packages")

exports.buildRef = function buildRef(highlight, markdown) {
  if (process.env.NO_REF) return []

  function buildOptions(name) {
    return {
      name,
      anchorPrefix: name + ".",
      allowUnresolvedTypes: false,
      markdownOptions: {highlight},
      breakAt: 45,
      processType(type) {
        let ext = null
        // Kludge to de-inline the Extension type when it is found in a union type
        if (type.type == "union" && type.typeArgs.length > 2 &&
            type.typeArgs.some(t => t.type == "ReadonlyArray" && (ext = t.typeArgs[0]).type == "Extension"))
          return Object.assign({}, type, {typeArgs: [ext].concat(type.typeArgs.filter(t => {
            return !((t.type == "ReadonlyArray" && t.typeArgs[0].type == "Extension") ||
                     (t.type == "Object" && t.properties?.extension))
          }))})
      },
      imports: [type => {
        let sibling = type.typeSource && modules.find(m => type.typeSource.startsWith("../" + m.name + "/"))
        if (sibling) return "#" + sibling.name + "." + type.type
      }, type => {
        if (/\blezer[\/-]tree\b/.test(type.typeSource)) return `https://lezer.codemirror.net/docs/ref/#tree.${type.type}`
        if (/\blezer\b/.test(type.typeSource)) return `https://lezer.codemirror.net/docs/ref/#lezer.${type.type}`
        if (/\bstyle-mod\b/.test(type.typeSource)) return "https://github.com/marijnh/style-mod#documentation"
      }, browserImports]
    }
  }

  let modules = loadPackages().packages.filter(p => core.includes(p.name)).map(pkg => {
    return {name: pkg.name, base: pkg.dir, main: pkg.main}
  })

  let items = gatherMany(modules.map(mod => ({filename: mod.main, basedir: mod.base})))
  return modules.map((mod, i) => {
    let main = join(mod.main, "../README.md")
    return {
      name: mod.name,
      content: build({...buildOptions(mod.name), main: existsSync(main) ? main : null}, items[i])
    }
  })
}
