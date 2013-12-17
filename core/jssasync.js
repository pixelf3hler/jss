/*!
   jssasync.js
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
   
   function _serializeObject(obj) {
      var p, ptype, r = "{"
      for(p in obj) {
         ptype = Object.prototype.toString.call(obj[p])
         r += '"' + p + '": '
         switch(ptype) {
            case "[object Function]":
               r += '"' + obj[p].toString() + '"'
            break
            case 
         }
      }
   }
   
   var
   evalAsync,
   def, // <= everything inside a jss def block is assigned to this object
   token = {
      LINEBREAKS: /\n|\r\n|\r/
   }, 
   xmlser = new XMLSerializer(),
   JSS = {}
   
   // set true before calling JSS.exec to process asynchronously
   JSS.async = false
   // use JSS.setAsync to do so..
   JSS.setAsync = function(value) {
      if(true === value) {
         JSS.async = true
         evalAsync = (function() {
            // new Worker('data:text/javascript;base64,c2VsZi5vbm1lc3NhZ2UgPSBmdW5jdGlvbiAoZSkgeyBzZWxmLnBvc3RNZXNzYWdlKHsgImlkIjogZS5kYXRhLmlkLCAicmVzcG9uc2UiOiBldmFsKGUuZGF0YS5jb2RlKSB9KTsgfQ==')
            // new Worker('data:text/javascript;charset=US_ASCII,self.onmessage%20%3D%20function%20%28e%29%20%7B%20self.postMessage%28%7B%20%22id%22%3A%20e.data.id%2C%20%22response%22%3A%20eval%28e.data.code%29%20%7D%29%3B%20%7D')
            var callbacks = [], worker = new Worker('core/evalasync.js')
            worker.onmessage = function(e) {
               callbacks[e.data.id] && callbacks[e.data.id](e.data.response)
               delete callbacks[e.data.id]
            }
            
            return function(code, callback) {
               callbacks.push(callback || null)
               worker.postMessage({
                  "def": _serializeObject(def),
                  "id": callbacks.length - 1,
                  "code": _escape(code)
               })
            }
            
         })()
      }else {
         // if value isn't explicitly set true it counts as false..
         JSS.async = false
         evalAsync = undefined
      }
   }
   
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
      if(token.LINEBREAKS.test(this.source)) {
         this.cleanSource = this.source.replace(/^<\?jss[^(?:\n|\r\n|\r)]*(?:\n|\r\n|\r)??|\?>$/gm, function(m) {
            if("?>" === m) return ""
            
            instruction = m.split(" ")
            if(instruction && 1 < instruction.length) {
               siht.isDefBlock = ("def" === instruction[1])
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
   
   JSS.Block.prototype.processAsync = function(input, callback) {
      var siht = this
      if(this.isDefBlock) {
         evalAsync("({" + this.cleanSource + "})", function(e) {
            def = e
            callback(input.replace(new RegExp(regEsc(siht.source),"g"), ""))
         })
      }else {
         evalAsync("(" + this.cleanSource + ")", function(e) {
            siht.output = e
            callback(input.replace(new RegExp(regEsc(siht.source), "g"), siht.output))
         })
      }
   }
   
   JSS.Block.prototype.process = function(input) {
      try{
         if(this.isDefBlock) {
            def = eval("({" + this.cleanSource + "})")
            //console.log(def)
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
      if(!node.remove)
         node.parentNode.removeChild(node)
      else 
         node.remove()
   }
   
   JSS.createStyleNode = function(css) {
      var node = window.document.createElement("style")
      node.setAttribute("type", "text/css")
      node.appendChild(window.document.createTextNode(css))
      window.document.getElementsByTagName("head")[0].appendChild(node)
   }
   
   JSS.exec = function(src) {
      src = src || window.document.querySelectorAll('style[type="text/x-jss"]')
      
      JSS.iter(src, function(itm) {
         var // serialize to string if neccessary and extract code blocks
         sourceCode = ("string" === typeof(itm)) ? itm : xmlser.serializeToString(itm)
         
         sourceCode = sourceCode.replace(/^\s*<style type="text\/x-jss">(?:\n|\r\n|\r)|(?:\n|\r\n|\r|\s)*<\/style>\s*$/mg, '')
         
         //console.log(sourceCode)
         
         sourceCode.replace(/<\?jss[^>]*>/g, function(m) {
            JSS.blocks.push(new JSS.Block(m))
            return m
         })
         
         JSS.input.push(sourceCode)
         JSS.removeDOMNode(itm)
      })
      
      if(JSS.blocks && JSS.blocks.length) {
         if(JSS.async) {
            var defBlock = (function() {
               var r, i = 0, n = JSS.blocks.length
               for(; i < n; i++) {
                  if(JSS.blocks[i].isDefBlock) {
                     r = JSS.blocks[i]
                     // remove defBlock
                     JSS.blocks.splice(i, 1)
                     break
                  }
               }
               return r
            })()
            
            if(defBlock) {
               var errors = JSS.blocks.length
               JSS.iter(JSS.input, function(itm) {
                  defBlock.processAsync(itm, function(preprocessed) {
                     JSS.iter(JSS.blocks, function(block) {
                        block.processAsync(preprocessed, function(processed) {
                           if(0 === --errors) {
                              console.log("async output: %s", processed)
                              JSS.createStyleNode(processed)
                           }
                        })
                     })
                  })
               })
            }else {
               // handle plain scripts..
            }
         }else {
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
   }
   
   window.JSS = JSS
   
})(window)