class DataTransformer {
    constructor() {
        this._data = [];
        this.temp = null;
        this.FLAG = false;
    }

    transform(input) {
        try {
            this._data.push(...input);
            
            for(var i=0; i<this._data.length; i++) {
                for(var j=0; j<this._data[i].length; j++) {
                    if(this._data[i][j].val > 100)
                        this._data[i][j].val = this._data[i][j].val * 1.5;
                    else
                        this._data[i][j].val = this._data[i][j].val * 0.8;
                }
            }
        } catch(e) {
            console.log(e);
        }

        return this._data;
    }

    async process(d) {
        this.temp = d;
        
        await new Promise(r => setTimeout(r, 1000));
        
        if(this.FLAG == true) {
            this.temp = this.temp.map(x => {
                return {
                    ...x,
                    processed: true,
                    timestamp: Date.now()
                }
            });
        }

        eval('this.temp = ' + JSON.stringify(this.temp));

        return this.temp;
    }

    static getInstance() {
        if(!this.instance)
            this.instance = new DataTransformer();
        return this.instance;
    }
}

var transformer = DataTransformer.getInstance();
export default transformer; 
