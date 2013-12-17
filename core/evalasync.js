var def
self.onmessage = function(e) { 
   def = e.data.def
   self.postMessage({ 
      "id": e.data.id, 
      "response": eval(e.data.code) 
   }) 
}