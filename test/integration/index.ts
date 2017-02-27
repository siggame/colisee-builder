import * as chai from "chai"
import * as db from "../../src/db"
import templateTest from "./template"


export default function (): void {
  describe("Integration Tests", function () {
    it("Should connect to the database", function () {
      this.retries(5);
      return new Promise((resolve, reject) => {
        db.query.raw("SELECT 1+1")
          .then(resolve)
          .catch(err => chai.expect(err).to.not.exist)
      })
    })
  })
  templateTest()
}
