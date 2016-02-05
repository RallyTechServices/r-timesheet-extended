describe("When using timezone utilities", function() {
    var sunday_in_utc = (new Date(Date.UTC(2016, 1, 7, 0, 0, 0)));    
    var sunday_local  = new Date(2016,1,7);
    var monday_local  = new Date(2016,1,8);
    var friday_local  = new Date(2016,1,12);
        
    it("given a date in a local timezone, should provide midnight sunday morning for that timezone",function(){
        // Feb 7, 2016 is a sunday
        
        expect(TSDateUtils.getBeginningOfWeekForLocalDate(sunday_local)).toEqual(sunday_local);
        expect(TSDateUtils.getBeginningOfWeekForLocalDate(monday_local)).toEqual(sunday_local);
        expect(TSDateUtils.getBeginningOfWeekForLocalDate(friday_local)).toEqual(sunday_local);
    });
    
    it("given a date in a local timezone, should provide a sunday iso string without timestamp",function(){
        // Feb 7, 2016 is a sunday
        var sunday_iso = '2016-02-07';
        
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(sunday_local)).toEqual(sunday_iso);
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(monday_local)).toEqual(sunday_iso);
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(friday_local)).toEqual(sunday_iso);
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(friday_local, false)).toEqual(sunday_iso);
    });
    
        
    it("given a date in a local timezone, should provide a sunday iso string with fake midnight timestamp",function(){
        // Feb 7, 2016 is a sunday
        var sunday_iso = '2016-02-07T00:00:00.0Z';
        
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(sunday_local,true)).toEqual(sunday_iso);
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(monday_local,true)).toEqual(sunday_iso);
        expect(TSDateUtils.getBeginningOfWeekISOForLocalDate(friday_local,true)).toEqual(sunday_iso);
    });
});
