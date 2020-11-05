const axios = require('axios');
const sampleBundle = require('./sampleBundle.json');

const { API_URL, API_ACCESS_TOKEN, API_KEY } = process.env;

axios.defaults.baseURL = API_URL;
axios.defaults.headers.common['x-api-key'] = API_KEY;
axios.defaults.headers.common.Authorization = `Bearer ${API_ACCESS_TOKEN}`;
axios.defaults.headers.post['Content-Type'] = 'application/json';
(async () => {
    try {
        const response = await axios.post('/', sampleBundle);
        console.log('response', response.data);
    } catch (e) {
        console.log('error is', e);
    }
})();

// const config = {
//     method: 'post',
//     url: 'https://rzm26l8d7k.execute-api.us-west-2.amazonaws.com/bulkexport',
//     headers: {
//         'x-api-key': API_KEY,
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${API_ACCESS_TOKEN}`,
//         // Authorization:
//         //     'Bearer eyJraWQiOiJ0UVhSRU1XbmZWbWl5VEtvTG9vU0U1REhPQ2l0eVZzVE5QMTRHQ0xTaWFnPSIsImFsZyI6IlJTMjU2In0.eyJzdWIiOiIxYmVhMGM4Yy0zOTAyLTQ4YzQtYmI4OS0wOWExMzVhNDFlYzkiLCJjb2duaXRvOmdyb3VwcyI6WyJwcmFjdGl0aW9uZXIiXSwiaXNzIjoiaHR0cHM6XC9cL2NvZ25pdG8taWRwLnVzLXdlc3QtMi5hbWF6b25hd3MuY29tXC91cy13ZXN0LTJfOHVxTDhHOHBuIiwidmVyc2lvbiI6MiwiY2xpZW50X2lkIjoiN2NzOGNhOWQ2cGVpOGVnZzZtaGNmanV0NW4iLCJldmVudF9pZCI6IjI1ZmIyYzE0LWIzYjctNGZhOC05OTI4LTgxMjk3ZWEwMDgwYyIsInRva2VuX3VzZSI6ImFjY2VzcyIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUiLCJhdXRoX3RpbWUiOjE2MDQ1MDgwODMsImV4cCI6MTYwNDUxMTY4MywiaWF0IjoxNjA0NTA4MDgzLCJqdGkiOiJiYzBlNDJlYS01ODMwLTQyNDktOTE4NC1hODc0YWIyNTBjOWUiLCJ1c2VybmFtZSI6IndvcmtzaG9wdXNlciJ9.H26w-jOBw18ElOGtNtxXcbiUKqDBwHAdoacSyZEVZG5SpoCV00oNz-UxVKxTR4j1xAl7AEdj1AGSnbp-rDdO2DQHRf-IoTqzeLSJW7MhS0eTDpS07fuJxoImSFueW6ZeBP7yvIbw79tvr1GNyTS0juvS1LBGP921MSDPLE-PH3b-FBnGFgEUi8NU8csm40joTzH5bekLJV67L4XvqouaSK7sx-bnOSwhCVgNp8769gQpPfvxvam3mWNXimferFxhNSauRdKjI1fyfSKoJxNWw8QsH9wpWQoAhSOqWNCoWjbyO2aFQa0onDdStIpO8WX05iW8FLLevSecDl6A2Q8Fsw',
//     },
//     data: sampleBundle,
// };
//
// axios(config)
//     .then(function(response) {
//         console.log(JSON.stringify(response.data));
//     })
//     .catch(function(error) {
//         console.log(error);
//     });
