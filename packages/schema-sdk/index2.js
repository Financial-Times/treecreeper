class SchemaUpdater {
	init()
}

const singleton

class SDKClass {
	constructor ({
		// one or the other
		schemaDirectory,
		schemaUpdater
	}) {

	}

	// Simplify cache keys to be concat args and stringified Obj.entries of options
	// don't worry about things using default optiosn not sharing same cache as those
	// explicitly passing it - really not that big a saving
}

module.exports = {
	async init (options) {
		const singleton = new SDKClass(options)
		return singleton.init();
	}
}

Object.defineProperty(module.exports, 'sdk', {
	get () {
		if (!singleton) {
			throw new Error('call init before attempting to use')
		}
		return singleton
	}
})




class DataAccessors {
    constructor(schemaClient) {
        this.schemaClient = schemaClient
        this.cache = new Cache();
        this.schemaClient.on('change', () => this.cache.clear())
        this.getType = this.cache.wrap(this.getType.bind(this))
    }

    getType (type, options = {}){
        checkCache(type, option1, option2...)
    }
}



module.exports = SDK
