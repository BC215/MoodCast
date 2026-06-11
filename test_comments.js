import axios from 'axios';
axios.get('http://localhost:8080/posts/1/comments').then(res => console.log(JSON.stringify(res.data, null, 2))).catch(err => console.error(err.message));
