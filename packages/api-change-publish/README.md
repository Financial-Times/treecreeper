A (probably) event driven wrapper around kinesis client taht the rest api controllers can hook into

Should probably accept a before and after data object, and calculate events from that

That way tests for controllers can just check they pass in the right params, and tests for which events get into kinesis based on a given input can be decoupled
