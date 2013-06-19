(function(b){var h,g,c;if(typeof window==="undefined"){h=require("underscore");g=require("backbone");c=module.exports=g}else{h=window._;g=window.Backbone;c=window}g.Relational={showWarnings:true};g.Semaphore={_permitsAvailable:null,_permitsUsed:0,acquire:function(){if(this._permitsAvailable&&this._permitsUsed>=this._permitsAvailable){throw new Error("Max permits acquired")}else{this._permitsUsed++}},release:function(){if(this._permitsUsed===0){throw new Error("All permits released")}else{this._permitsUsed--}},isLocked:function(){return this._permitsUsed>0},setAvailablePermits:function(j){if(this._permitsUsed>j){throw new Error("Available permits cannot be less than used permits")}this._permitsAvailable=j}};g.BlockingQueue=function(){this._queue=[]};h.extend(g.BlockingQueue.prototype,g.Semaphore,{_queue:null,add:function(j){if(this.isBlocked()){this._queue.push(j)}else{j()}},process:function(){while(this._queue&&this._queue.length){this._queue.shift()()}},block:function(){this.acquire()},unblock:function(){this.release();if(!this.isBlocked()){this.process()}},isBlocked:function(){return this.isLocked()}});g.Relational.eventQueue=new g.BlockingQueue();g.Store=function(){this._collections=[];this._reverseRelations=[];this._subModels=[];this._modelScopes=[c]};h.extend(g.Store.prototype,g.Events,{addModelScope:function(j){this._modelScopes.push(j)},addSubModels:function(j,k){this._subModels.push({superModelType:k,subModels:j})},setupSuperModel:function(j){h.find(this._subModels,function(k){return h.find(k.subModels,function(m,n){var l=this.getObjectByName(m);if(j===l){k.superModelType._subModels[n]=j;j._superModel=k.superModelType;j._subModelTypeValue=n;j._subModelTypeAttribute=k.superModelType.prototype.subModelTypeAttribute;return true}},this)},this)},addReverseRelation:function(l){var k=h.any(this._reverseRelations,function(m){return h.all(l,function(o,n){return o===m[n]})});if(!k&&l.model&&l.type){this._reverseRelations.push(l);var j=function(m,n){if(!m.prototype.relations){m.prototype.relations=[]}m.prototype.relations.push(n);h.each(m._subModels,function(o){j(o,n)},this)};j(l.model,l);this.retroFitRelation(l)}},retroFitRelation:function(k){var j=this.getCollection(k.model);j.each(function(l){if(!(l instanceof k.model)){return}new k.type(l,k)},this)},getCollection:function(k){if(k instanceof g.RelationalModel){k=k.constructor}var j=k;while(j._superModel){j=j._superModel}var l=h.detect(this._collections,function(m){return m.model===j});if(!l){l=this._createCollection(k)}return l},getObjectByName:function(j){var l=j.split("."),k=null;h.find(this._modelScopes,function(m){k=h.reduce(l,function(n,o){return n[o]},m);if(k&&k!==m){return true}},this);return k},_createCollection:function(k){var j;if(k instanceof g.RelationalModel){k=k.constructor}if(k.prototype instanceof g.RelationalModel){j=new g.Collection();j.model=k;this._collections.push(j)}return j},resolveIdForItem:function(j,k){var l=h.isString(k)||h.isNumber(k)?k:null;if(l==null){if(k instanceof g.RelationalModel){l=k.id}else{if(h.isObject(k)){l=k[j.prototype.idAttribute]}}}return l},find:function(k,l){var n=this.resolveIdForItem(k,l);var j=this.getCollection(k);if(j){var m=j.get(n);if(m instanceof k){return m}}return null},register:function(k){var j=k.collection;var l=this.getCollection(k);l&&l.add(k);k.bind("destroy",this.unregister,this);k.collection=j},update:function(j){var k=this.getCollection(j);k._onModelEvent("change:"+j.idAttribute,j,k)},unregister:function(j){j.unbind("destroy",this.unregister);var k=this.getCollection(j);k&&k.remove(j)}});g.Relational.store=new g.Store();g.Relation=function(j,k){this.instance=j;k=h.isObject(k)?k:{};this.reverseRelation=h.defaults(k.reverseRelation||{},this.options.reverseRelation);this.reverseRelation.type=!h.isString(this.reverseRelation.type)?this.reverseRelation.type:g[this.reverseRelation.type]||g.Relational.store.getObjectByName(this.reverseRelation.type);this.model=k.model||this.instance.constructor;this.options=h.defaults(k,this.options,g.Relation.prototype.options);this.key=this.options.key;this.keySource=this.options.keySource||this.key;this.keyDestination=this.options.keyDestination||this.keySource||this.key;this.relatedModel=this.options.relatedModel;if(h.isString(this.relatedModel)){this.relatedModel=g.Relational.store.getObjectByName(this.relatedModel)}if(!this.checkPreconditions()){return false}if(j){this.keyContents=this.instance.get(this.keySource);if(this.key!==this.keySource){this.instance.unset(this.keySource,{silent:true})}this.instance._relations.push(this)}if(!this.options.isAutoRelation&&this.reverseRelation.type&&this.reverseRelation.key){g.Relational.store.addReverseRelation(h.defaults({isAutoRelation:true,model:this.relatedModel,relatedModel:this.model,reverseRelation:this.options},this.reverseRelation))}h.bindAll(this,"_modelRemovedFromCollection","_relatedModelAdded","_relatedModelRemoved");if(j){this.initialize();g.Relational.store.getCollection(this.instance).bind("relational:remove",this._modelRemovedFromCollection);g.Relational.store.getCollection(this.relatedModel).bind("relational:add",this._relatedModelAdded).bind("relational:remove",this._relatedModelRemoved)}};g.Relation.extend=g.Model.extend;h.extend(g.Relation.prototype,g.Events,g.Semaphore,{options:{createModels:true,includeInJSON:true,isAutoRelation:false},instance:null,key:null,keyContents:null,relatedModel:null,reverseRelation:null,related:null,_relatedModelAdded:function(l,m,k){var j=this;l.queue(function(){j.tryAddRelated(l,k)})},_relatedModelRemoved:function(k,l,j){this.removeRelated(k,j)},_modelRemovedFromCollection:function(j){if(j===this.instance){this.destroy()}},checkPreconditions:function(){var n=this.instance,l=this.key,j=this.model,p=this.relatedModel,q=g.Relational.showWarnings&&typeof console!=="undefined";if(!j||!l||!p){q&&console.warn("Relation=%o; no model, key or relatedModel (%o, %o, %o)",this,j,l,p);return false}if(!(j.prototype instanceof g.RelationalModel)){q&&console.warn("Relation=%o; model does not inherit from Backbone.RelationalModel (%o)",this,n);return false}if(!(p.prototype instanceof g.RelationalModel)){q&&console.warn("Relation=%o; relatedModel does not inherit from Backbone.RelationalModel (%o)",this,p);return false}if(this instanceof g.HasMany&&this.reverseRelation.type===g.HasMany){q&&console.warn("Relation=%o; relation is a HasMany, and the reverseRelation is HasMany as well.",this);return false}if(n&&n._relations.length){var o=h.any(n._relations,function(k){var m=this.reverseRelation.key&&k.reverseRelation.key;return k.relatedModel===p&&k.key===l&&(!m||this.reverseRelation.key===k.reverseRelation.key)},this);if(o){q&&console.warn("Relation=%o between instance=%o.%s and relatedModel=%o.%s already exists",this,n,l,p,this.reverseRelation.key);return false}}return true},setRelated:function(k,j){this.related=k;this.instance.acquire();this.instance.set(this.key,k,h.defaults(j||{},{silent:true}));this.instance.release()},_isReverseRelation:function(j){if(j.instance instanceof this.relatedModel&&this.reverseRelation.key===j.key&&this.key===j.reverseRelation.key){return true}return false},getReverseRelations:function(j){var k=[];var l=!h.isUndefined(j)?[j]:this.related&&(this.related.models||[this.related]);h.each(l,function(m){h.each(m.getRelations(),function(n){if(this._isReverseRelation(n)){k.push(n)}},this)},this);return k},sanitizeOptions:function(j){j=j?h.clone(j):{};if(j.silent){j.silentChange=true;delete j.silent}return j},unsanitizeOptions:function(j){j=j?h.clone(j):{};if(j.silentChange){j.silent=true;delete j.silentChange}return j},destroy:function(){g.Relational.store.getCollection(this.instance).unbind("relational:remove",this._modelRemovedFromCollection);g.Relational.store.getCollection(this.relatedModel).unbind("relational:add",this._relatedModelAdded).unbind("relational:remove",this._relatedModelRemoved);h.each(this.getReverseRelations(),function(j){j.removeRelated(this.instance)},this)}});g.HasOne=g.Relation.extend({options:{reverseRelation:{type:"HasMany"}},initialize:function(){h.bindAll(this,"onChange");this.instance.bind("relational:change:"+this.key,this.onChange);var j=this.findRelated({silent:true});this.setRelated(j);h.each(this.getReverseRelations(),function(k){k.addRelated(this.instance)},this)},findRelated:function(k){var l=this.keyContents;var j=null;if(l instanceof this.relatedModel){j=l}else{if(l){j=this.relatedModel.findOrCreate(l,{create:this.options.createModels})}}return j},onChange:function(m,j,l){if(this.isLocked()){return}this.acquire();l=this.sanitizeOptions(l);var p=h.isUndefined(l._related);var n=p?this.related:l._related;if(p){this.keyContents=j;if(j instanceof this.relatedModel){this.related=j}else{if(j){var o=this.findRelated(l);this.setRelated(o)}else{this.setRelated(null)}}}if(n&&this.related!==n){h.each(this.getReverseRelations(n),function(q){q.removeRelated(this.instance,l)},this)}h.each(this.getReverseRelations(),function(q){q.addRelated(this.instance,l)},this);if(!l.silentChange&&this.related!==n){var k=this;g.Relational.eventQueue.add(function(){k.instance.trigger("update:"+k.key,k.instance,k.related,l)})}this.release()},tryAddRelated:function(k,j){if(this.related){return}j=this.sanitizeOptions(j);var l=this.keyContents;if(l){var m=g.Relational.store.resolveIdForItem(this.relatedModel,l);if(k.id===m){this.addRelated(k,j)}}},addRelated:function(k,j){if(k!==this.related){var l=this.related||null;this.setRelated(k);this.onChange(this.instance,k,{_related:l})}},removeRelated:function(k,j){if(!this.related){return}if(k===this.related){var l=this.related||null;this.setRelated(null);this.onChange(this.instance,k,{_related:l})}}});g.HasMany=g.Relation.extend({collectionType:null,options:{reverseRelation:{type:"HasOne"},collectionType:g.Collection,collectionKey:true,collectionOptions:{}},initialize:function(){h.bindAll(this,"onChange","handleAddition","handleRemoval","handleReset");this.instance.bind("relational:change:"+this.key,this.onChange);this.collectionType=this.options.collectionType;if(h.isString(this.collectionType)){this.collectionType=g.Relational.store.getObjectByName(this.collectionType)}if(!this.collectionType.prototype instanceof g.Collection){throw new Error("collectionType must inherit from Backbone.Collection")}if(this.keyContents instanceof g.Collection){this.setRelated(this._prepareCollection(this.keyContents))}else{this.setRelated(this._prepareCollection())}this.findRelated({silent:true})},_getCollectionOptions:function(){return h.isFunction(this.options.collectionOptions)?this.options.collectionOptions(this.instance):this.options.collectionOptions},_prepareCollection:function(k){if(this.related){this.related.unbind("relational:add",this.handleAddition).unbind("relational:remove",this.handleRemoval).unbind("relational:reset",this.handleReset)}if(!k||!(k instanceof g.Collection)){k=new this.collectionType([],this._getCollectionOptions())}k.model=this.relatedModel;if(this.options.collectionKey){var j=this.options.collectionKey===true?this.options.reverseRelation.key:this.options.collectionKey;if(k[j]&&k[j]!==this.instance){if(g.Relational.showWarnings&&typeof console!=="undefined"){console.warn("Relation=%o; collectionKey=%s already exists on collection=%o",this,j,this.options.collectionKey)}}else{if(j){k[j]=this.instance}}}k.bind("relational:add",this.handleAddition).bind("relational:remove",this.handleRemoval).bind("relational:reset",this.handleReset);return k},findRelated:function(j){if(this.keyContents){var k=[];if(this.keyContents instanceof g.Collection){k=this.keyContents.models}else{this.keyContents=h.isArray(this.keyContents)?this.keyContents:[this.keyContents];h.each(this.keyContents,function(m){var l=null;if(m instanceof this.relatedModel){l=m}else{l=this.relatedModel.findOrCreate(m,{create:this.options.createModels})}if(l&&!this.related.getByCid(l)&&!this.related.get(l)){k.push(l)}},this)}if(k.length){j=this.unsanitizeOptions(j);this.related.add(k,j)}}},onChange:function(m,j,l){l=this.sanitizeOptions(l);this.keyContents=j;h.each(this.getReverseRelations(),function(o){o.removeRelated(this.instance,l)},this);if(j instanceof g.Collection){this._prepareCollection(j);this.related=j}else{var n;if(this.related instanceof g.Collection){n=this.related;n.remove(n.models)}else{n=this._prepareCollection()}this.setRelated(n);this.findRelated(l)}h.each(this.getReverseRelations(),function(o){o.addRelated(this.instance,l)},this);var k=this;g.Relational.eventQueue.add(function(){!l.silentChange&&k.instance.trigger("update:"+k.key,k.instance,k.related,l)})},tryAddRelated:function(k,j){j=this.sanitizeOptions(j);if(!this.related.getByCid(k)&&!this.related.get(k)){var l=h.any(this.keyContents,function(m){var n=g.Relational.store.resolveIdForItem(this.relatedModel,m);return n&&n===k.id},this);if(l){this.related.add(k,j)}}},handleAddition:function(l,m,k){if(!(l instanceof g.Model)){return}k=this.sanitizeOptions(k);h.each(this.getReverseRelations(l),function(n){n.addRelated(this.instance,k)},this);var j=this;g.Relational.eventQueue.add(function(){!k.silentChange&&j.instance.trigger("add:"+j.key,l,j.related,k)})},handleRemoval:function(l,m,k){if(!(l instanceof g.Model)){return}k=this.sanitizeOptions(k);h.each(this.getReverseRelations(l),function(n){n.removeRelated(this.instance,k)},this);var j=this;g.Relational.eventQueue.add(function(){!k.silentChange&&j.instance.trigger("remove:"+j.key,l,j.related,k)})},handleReset:function(l,k){k=this.sanitizeOptions(k);var j=this;g.Relational.eventQueue.add(function(){!k.silentChange&&j.instance.trigger("reset:"+j.key,j.related,k)})},addRelated:function(l,k){var j=this;k=this.unsanitizeOptions(k);l.queue(function(){if(j.related&&!j.related.getByCid(l)&&!j.related.get(l)){j.related.add(l,k)}})},removeRelated:function(k,j){j=this.unsanitizeOptions(j);if(this.related.getByCid(k)||this.related.get(k)){this.related.remove(k,j)}}});g.RelationalModel=g.Model.extend({relations:null,_relations:null,_isInitialized:false,_deferProcessing:false,_queue:null,subModelTypeAttribute:"type",subModelTypes:null,constructor:function(k,l){var j=this;if(l&&l.collection){this._deferProcessing=true;var m=function(n){if(n===j){j._deferProcessing=false;j.processQueue();l.collection.unbind("relational:add",m)}};l.collection.bind("relational:add",m);h.defer(function(){m(j)})}this._queue=new g.BlockingQueue();this._queue.block();g.Relational.eventQueue.block();g.Model.apply(this,arguments);g.Relational.eventQueue.unblock()},trigger:function(k){if(k.length>5&&"change"===k.substr(0,6)){var j=this,l=arguments;g.Relational.eventQueue.add(function(){g.Model.prototype.trigger.apply(j,l)})}else{g.Model.prototype.trigger.apply(this,arguments)}return this},initializeRelations:function(){this.acquire();this._relations=[];h.each(this.relations,function(j){var k=!h.isString(j.type)?j.type:g[j.type]||g.Relational.store.getObjectByName(j.type);if(k&&k.prototype instanceof g.Relation){new k(this,j)}else{g.Relational.showWarnings&&typeof console!=="undefined"&&console.warn("Relation=%o; missing or invalid type!",j)}},this);this._isInitialized=true;this.release();this.processQueue()},updateRelations:function(j){if(this._isInitialized&&!this.isLocked()){h.each(this._relations,function(k){var l=this.attributes[k.keySource]||this.attributes[k.key];if(k.related!==l){this.trigger("relational:change:"+k.key,this,l,j||{})}},this)}},queue:function(j){this._queue.add(j)},processQueue:function(){if(this._isInitialized&&!this._deferProcessing&&this._queue.isBlocked()){this._queue.unblock()}},getRelation:function(j){return h.detect(this._relations,function(k){if(k.key===j){return true}},this)},getRelations:function(){return this._relations},fetchRelated:function(p,r,n){r||(r={});var m,k=[],q=this.getRelation(p),s=q&&q.keyContents,o=s&&h.select(h.isArray(s)?s:[s],function(t){var u=g.Relational.store.resolveIdForItem(q.relatedModel,t);return u&&(n||!g.Relational.store.find(q.relatedModel,u))},this);if(o&&o.length){var l=h.map(o,function(v){var u;if(h.isObject(v)){u=q.relatedModel.build(v)}else{var t={};t[q.relatedModel.prototype.idAttribute]=v;u=q.relatedModel.build(t)}return u},this);if(q.related instanceof g.Collection&&h.isFunction(q.related.url)){m=q.related.url(l)}if(m&&m!==q.related.url()){var j=h.defaults({error:function(){var t=arguments;h.each(l,function(u){u.trigger("destroy",u,u.collection,r);r.error&&r.error.apply(u,t)})},url:m},r,{add:true});k=[q.related.fetch(j)]}else{k=h.map(l,function(t){var u=h.defaults({error:function(){t.trigger("destroy",t,t.collection,r);r.error&&r.error.apply(t,arguments)}},r);return t.fetch(u)},this)}}return k},set:function(m,n,l){g.Relational.eventQueue.block();var k;if(h.isObject(m)||m==null){k=m;l=n}else{k={};k[m]=n}var j=g.Model.prototype.set.apply(this,arguments);if(!this._isInitialized&&!this.isLocked()){this.constructor.initializeModelHierarchy();g.Relational.store.register(this);this.initializeRelations()}else{if(k&&this.idAttribute in k){g.Relational.store.update(this)}}if(k){this.updateRelations(l)}g.Relational.eventQueue.unblock();return j},unset:function(l,k){g.Relational.eventQueue.block();var j=g.Model.prototype.unset.apply(this,arguments);this.updateRelations(k);g.Relational.eventQueue.unblock();return j},clear:function(k){g.Relational.eventQueue.block();var j=g.Model.prototype.clear.apply(this,arguments);this.updateRelations(k);g.Relational.eventQueue.unblock();return j},change:function(l){var j=this,k=arguments;g.Relational.eventQueue.add(function(){g.Model.prototype.change.apply(j,k)})},clone:function(){var j=h.clone(this.attributes);if(!h.isUndefined(j[this.idAttribute])){j[this.idAttribute]=null}h.each(this.getRelations(),function(k){delete j[k.key]});return new this.constructor(j)},toJSON:function(){if(this.isLocked()){return this.id}this.acquire();var j=g.Model.prototype.toJSON.call(this);if(this.constructor._superModel&&!(this.constructor._subModelTypeAttribute in j)){j[this.constructor._subModelTypeAttribute]=this.constructor._subModelTypeValue}h.each(this._relations,function(k){var m=j[k.key];if(k.options.includeInJSON===true){if(m&&h.isFunction(m.toJSON)){j[k.keyDestination]=m.toJSON()}else{j[k.keyDestination]=null}}else{if(h.isString(k.options.includeInJSON)){if(m instanceof g.Collection){j[k.keyDestination]=m.pluck(k.options.includeInJSON)}else{if(m instanceof g.Model){j[k.keyDestination]=m.get(k.options.includeInJSON)}else{j[k.keyDestination]=null}}}else{if(h.isArray(k.options.includeInJSON)){if(m instanceof g.Collection){var l=[];m.each(function(o){var n={};h.each(k.options.includeInJSON,function(p){n[p]=o.get(p)});l.push(n)});j[k.keyDestination]=l}else{if(m instanceof g.Model){var l={};h.each(k.options.includeInJSON,function(n){l[n]=m.get(n)});j[k.keyDestination]=l}else{j[k.keyDestination]=null}}}else{delete j[k.key]}}}if(k.keyDestination!==k.key){delete j[k.key]}});this.release();return j}},{setup:function(j){this.prototype.relations=(this.prototype.relations||[]).slice(0);this._subModels={};this._superModel=null;if(this.prototype.hasOwnProperty("subModelTypes")){g.Relational.store.addSubModels(this.prototype.subModelTypes,this)}else{this.prototype.subModelTypes=null}h.each(this.prototype.relations,function(k){if(!k.model){k.model=this}if(k.reverseRelation&&k.model===this){var m=true;if(h.isString(k.relatedModel)){var l=g.Relational.store.getObjectByName(k.relatedModel);m=l&&(l.prototype instanceof g.RelationalModel)}var n=!h.isString(k.type)?k.type:g[k.type]||g.Relational.store.getObjectByName(k.type);if(m&&n&&n.prototype instanceof g.Relation){new n(null,k)}}},this)},build:function(l,n){var m=this;this.initializeModelHierarchy();if(this._subModels&&this.prototype.subModelTypeAttribute in l){var k=l[this.prototype.subModelTypeAttribute];var j=this._subModels[k];if(j){m=j}}return new m(l,n)},initializeModelHierarchy:function(){if(h.isUndefined(this._superModel)||h.isNull(this._superModel)){g.Relational.store.setupSuperModel(this);if(this._superModel){if(this._superModel.prototype.relations){var j=h.any(this.prototype.relations,function(k){return k.model&&k.model!==this},this);if(!j){this.prototype.relations=this._superModel.prototype.relations.concat(this.prototype.relations)}}}else{this._superModel=false}}if(this.prototype.subModelTypes&&h.keys(this.prototype.subModelTypes).length!==h.keys(this._subModels).length){h.each(this.prototype.subModelTypes,function(l){var k=g.Relational.store.getObjectByName(l);k&&k.initializeModelHierarchy()})}},findOrCreate:function(j,l){var k=g.Relational.store.find(this,j);if(h.isObject(j)){if(k){k.set(j,l)}else{if(!l||(l&&l.create!==false)){k=this.build(j,l)}}}return k}});h.extend(g.RelationalModel.prototype,g.Semaphore);g.Collection.prototype.__prepareModel=g.Collection.prototype._prepareModel;g.Collection.prototype._prepareModel=function(l,k){k||(k={});if(!(l instanceof g.Model)){var j=l;k.collection=this;if(typeof this.model.build!=="undefined"){l=this.model.build(j,k)}else{l=new this.model(j,k)}if(!l._validate(l.attributes,k)){l=false}}else{if(!l.collection){l.collection=this}}return l};var i=g.Collection.prototype.__add=g.Collection.prototype.add;g.Collection.prototype.add=function(l,j){j||(j={});if(!h.isArray(l)){l=[l]}var k=[];h.each(l,function(n){if(!(n instanceof g.Model)){var m=g.Relational.store.find(this.model,n[this.model.prototype.idAttribute]);if(m){m.set(m.parse?m.parse(n):n,j);n=m}else{n=g.Collection.prototype._prepareModel.call(this,n,j)}}if(n instanceof g.Model&&!this.get(n)&&!this.getByCid(n)){k.push(n)}},this);if(k.length){i.call(this,k,j);h.each(k,function(m){this.trigger("relational:add",m,this,j)},this)}return this};var e=g.Collection.prototype.__remove=g.Collection.prototype.remove;g.Collection.prototype.remove=function(k,j){j||(j={});if(!h.isArray(k)){k=[k]}else{k=k.slice(0)}h.each(k,function(l){l=this.getByCid(l)||this.get(l);if(l instanceof g.Model){e.call(this,l,j);this.trigger("relational:remove",l,this,j)}},this);return this};var f=g.Collection.prototype.__reset=g.Collection.prototype.reset;g.Collection.prototype.reset=function(k,j){f.call(this,k,j);this.trigger("relational:reset",this,j);return this};var d=g.Collection.prototype.__sort=g.Collection.prototype.sort;g.Collection.prototype.sort=function(j){d.call(this,j);this.trigger("relational:reset",this,j);return this};var a=g.Collection.prototype.__trigger=g.Collection.prototype.trigger;g.Collection.prototype.trigger=function(k){if(k==="add"||k==="remove"||k==="reset"){var j=this,l=arguments;g.Relational.eventQueue.add(function(){a.apply(j,l)})}else{a.apply(this,arguments)}return this};g.RelationalModel.extend=function(j,k){var l=g.Model.extend.apply(this,arguments);l.setup(this);return l}})();