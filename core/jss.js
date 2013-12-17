/*!
   jss.js
   version 0.1.0
 © 2013 max ɐʇ pixelf3hler · de
   The MIT License
   see license.txt
   
   roadmap version 1.0.0:
   - load source files via xhr/jsonp
   - support multithreading / asynchronous eval (come up with a way to pass function objects to the worker)
   - since using eval is generally considered evil, maybe i should think about an alternative
*/
(function(window, undefined) {
   
   // utils
   function regEsc(str) {
      return str.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\-]', 'g'), '\\$&')
   }
   
   function isDOMNode(obj) {
      var ts = Object.prototype.toString.call(obj)
      ts = ts.substring(ts.indexOf(" ") + 1, ts.length-1).toLowerCase()
      
      return (/^html/.test(ts) && /element$/.test(ts))
   }
   
   function isURL(str) {
      return ("string" === typeof(str) && /(?:https?:\/\/)?[\w.\/\-]+\.(?:j|c)ss?$/i.test(str))
   }
   
   function loadFile(url, callback) {
      var xhr = new XMLHttpRequest()
      xhr.open('GET', url, true)
      xhr.onreadystatechange = function() {
         if(4 === this.readyState && 200 === this.status) {
            callback(this.responseText)
         }
      }
      xhr.send(null)
   }
   
   var 
   defId, // <= everything inside a jss def block is assigned to GLOBAL[defId]
   GLOBAL = this,
   xmlser = new XMLSerializer(),
   JSS = {}
   
   // use JSS.iter to iterate over array-like objects (e.g. NodeList) or arrays
   JSS.iter = function(list, callback) {
      var i = 0, n = list.length
      for(; i < n; i++) {
         callback(list[i], i, list)
      }
      return list
   }
   
   JSS.Block = function(source) {
      this.source = source || ""
      this.cleanSource = ""
      this.output = ""
      this.isDefBlock = false
      
      this.build()
   }
   
   JSS.Block.prototype.build = function() {
      this.source = this.source.replace(/^\s*|\s*$/g, '')
      
      var instruction = "", siht = this
      // multiline?
      if(/\n|\r\n|\r/.test(this.source)) {
         this.cleanSource = this.source.replace(/^<\?jss[^(?:\n|\r\n|\r)]*(?:\n|\r\n|\r)??|\?>$/gm, function(m) {
            if("?>" === m) return ""
            
            instruction = m.split(" ")
            if(instruction && 1 < instruction.length) {
               var d = instruction[1].split("=")
               defId = (1 < d.length) ? eval(d[1]) : "def"
               siht.isDefBlock = ("def" === d[0])
               if(siht.isDefBlock) {
                  siht.output = ""
               }
            }
            return ""
         })
         
      }else {
         this.cleanSource = this.source.replace(/^<\?jss\s*|\s*\?>$/g, '')
      }
   }
   
   JSS.Block.prototype.process = function(input) {
      try{
      //console.log(this.cleanSource)
         if(this.isDefBlock) {
            if(!GLOBAL[defId]) {
               GLOBAL[defId] = eval("({" + this.cleanSource + "})")
            }else {
               var p, tmp = eval("({" + this.cleanSource + "})")
               if(tmp) {
                  for(p in tmp) {
                     GLOBAL[defId][p] = tmp[p]
                  }
               }
            }
         }else {
            this.output = eval("(" + this.cleanSource + ")")
         }
      }catch(err) {
         window.console && console.log("error during eval: %o", err)
      }
      
      return input.replace(new RegExp(regEsc(this.source), "g"), this.output)
   }
   
   JSS.blocks = []
   JSS.input = []
   JSS.output = []
   
   JSS.removeDOMNode = function(node) {
      if(isDOMNode(node)) {
         if(!node.remove)
            node.parentNode.removeChild(node)
         else 
            node.remove()
      }
   }
   
   JSS.createStyleNode = function(css) {
      var node = window.document.createElement("style")
      node.setAttribute("type", "text/css")
      node.appendChild(window.document.createTextNode(css))
      window.document.getElementsByTagName("head")[0].appendChild(node)
   }
   
   JSS.parse = function(src) {
      var chr, lchr, nchr, blockIdx = 0, blockChars = "", mode = "open", i = 0, n = src.length
      for(; i < n; i++) {
         chr = src.charAt(i)
         nchr = src.charAt(i+1)
         lchr = src.charAt(i-1)
         
         if("<" === chr && "?" === nchr) {
            if("open" === mode) {
               mode = "jss"
            }
         }
         
         if("jss" === mode) {
            blockChars += chr
            if("?" === lchr && ">" === chr) {
               mode = "open"
               JSS.blocks.push(new JSS.Block(blockChars))
               blockChars = ""
            }
         }
      }
      
   }
   
   JSS.process = function() {
      if(JSS.blocks && JSS.blocks.length) {         
         JSS.iter(JSS.input, function(itm) {
            var o = itm
            JSS.iter(JSS.blocks, function(block) {
               o = block.process(o)
            })
            // check if o actually contains some
            // word characters before pushing it
            if(/\w+/.test(o)) JSS.output.push(o)
         })
         
         window.console && console.log("JSS.output: %s", JSS.output.join("\n\n"))
         
         JSS.createStyleNode(JSS.output.join("\n"))
      }
   }
   
   JSS.exec = function(src) {
      src = src || window.document.querySelectorAll('style[type="text/x-jss"]')
      
      if(isURL(src)) {            
         loadFile(src, function(r) {
            r = r.replace(/^\s*|\s*$/g, '')
            JSS.parse(r)
            JSS.input.push(r)
            JSS.process()
         })
      }else {
         JSS.iter(src, function(itm) {
            var // serialize to string if neccessary and extract code blocks
            source = ("string" === typeof(itm)) ? itm : xmlser.serializeToString(itm)
                     
            source = source.replace(/^\s*<style type="text\/x-jss">(?:\n|\r\n|\r)|(?:\n|\r\n|\r|\s)*<\/style>\s*$/mg, '')
            JSS.parse(source)
            JSS.input.push(source)
            JSS.removeDOMNode(itm)
         })
         
         JSS.process()
      }
   }
   
   window.JSS = JSS
   
})(window)