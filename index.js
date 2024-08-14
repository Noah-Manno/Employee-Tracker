const figlet = require('figlet');
const { promptUser } = require('./questions');

figlet("Employee", function (error, data) {
    if (error) {
        console.log('error, error, error!');
        console.dir(err)
        return
    }
    console.log(data)

    figlet('Manager', function (error, data) {
        if (error) {
            console.log('error, error, error!');
            console.dir(err)
            return
        }
        console.log(data)
    });
    promptUser();
})