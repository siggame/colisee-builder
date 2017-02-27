import * as chai from "chai";

export default function() {

  describe("Unit Tests", function(){
    it('should be sane', function(){
      chai.expect(true).is.true;
      chai.expect(false).is.false;
    })
    it('should not be insane', function(){
      chai.expect(true).is.not.false;
      chai.expect(false).is.not.true;
    })
  })

}
