import integrationTests from "./integration";
import unitTests from "./unit";


describe('Main', function(){
    unitTests();
    integrationTests();
});