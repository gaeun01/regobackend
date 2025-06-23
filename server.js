const express = require('express');//express 기본 라우팅
const app = express();//express 기본 라우팅
const port = 9070;
const cors = require('cors');
const mysql = require('mysql'); //또는 require('mysql2');
const bcrypt = require('bcrypt'); //해시 암호화를 위함
const jwt = require('jsonwebtoken'); //토큰 생성을 위함
const SECRET_KEY = 'test';
app.use(cors());
app.use(express.json()); //JSON 본문 파싱 미들웨어


const connection = mysql.createConnection({
    host: 'database',
    user: 'root',
    password: '1234',
    database: 'kdt'
});

connection.connect((err) => {
    if (err) {
        console.error('MySQL 연결 실패:', err);
        return;
    }
    console.log('MySQL 연결 성공!');
});



// 회원가입
app.post('/join', async(req,res)=>{
  const {userid, password, nickname, email}= req.body;
  const hash = await bcrypt.hash(password, 10);

  connection.query(
    "INSERT INTO rego_user (userid, password, nickname, email) VALUES (?,?,?,?)", [userid, hash, nickname, email],(err)=>{
      if(err){
        if(err.code == 'ER_DUP_ENTRY'){
          return res.status(400).json({error:'이미 존재하는 아이디입니다.'});
        }
        return res.status(500).json({error:'회원가입실패'});
      }
      res.json({success:true});
    }
  );
});
// 로그인
app.post('/login',(req,res)=>{
  const {userid, password} = req.body;

  connection.query('SELECT * FROM rego_user WHERE userid=?', [userid], (err, result)=>{
    if(err||result.length===0){
      return res.status(401).json({error:'아이디 또는 비밀번호를 확인해주세요.'});
    }
    const user = result[0];

    bcrypt.compare(password, user.password,(err, isMatch) =>{
    if(err || !isMatch){
      return res.status(401).json({error: '아이디 또는 비밀번호를 확인해주세요.'});
    }

    const token = jwt.sign({id:user.id, userid:user.userid}, SECRET_KEY,{expiresIn:'1h'});

    res.json({token, nickname:user.nickname});
  });
});
});

//장바구니 조회
app.get('/cart', (req,res) => {
  const {userId} = req.query;

  connection.query(
    'SELECT * FROM cart WHERE userid =? ORDER BY no DESC',
    [userId],
    (err, results) => {
      if(err) return res.status(500).json({ error: 'DB 조회 실패'});
      res.json(results);
    }
  );
});

//장바구니 추가
app.post('/cart', (req, res) => {
  const { userId, product } = req.body;
  if (!userId || !product) {
    return res.status(400).json({ error: '필수값 누락' });
  }
  connection.query(
    'INSERT INTO cart (userid, title, `desc`, img, price) VALUES (?,?,?,?,?)',[userId, product.title, product.desc,product.img,product.price],
    (err, result) => {
      if(err) {
        console.error('장바구니 추가 에러 :', err); 
        return res. status(500).json({ error: '장바구니 추가 실패' });
      } 
      res.json({success:true});
    }
  );
});
//장바구니 삭제
app.delete('/cart/:no', (req, res) => {
  const no = req.params.no;

  connection.query(
    'DELETE FROM cart WHERE no = ?', [no],
    (err, result) => {
      if (err) {
        console.error('삭제 오류:', err);
        return res.status(500).json({ error: '상품 삭제 실패' });
      }
      res.json({ success: true });
    }
  );
});

// 상품 목록 조회 (전체)
app.get('/mypage/:userid', (req, res) => {
  const {userid} = req.params;
  connection.query(
    'SELECT * FROM selling WHERE userid=? ORDER BY id DESC',[userid],
    (err, results) => {
      if (err) return res.status(500).json({ error: '상품 목록 조회 실패' });
      res.json(results);
    }
  );
});

// 상품 상세 조회
app.get('/mypage/item/:id', (req, res) => {
  const { id } = req.params;
  connection.query(
    'SELECT * FROM selling WHERE id = ?',
    [id],
    (err, results) => {
      if (err) return res.status(500).json({ error: '상품 조회 실패' });
      if (results.length === 0) return res.status(404).json({ error: '상품을 찾을 수 없습니다.' });
      res.json(results[0]);
    }
  );
});


// 상품 등록
app.post('/write', (req, res) => {
  const { img, title, cate, price, status, desc, delivery,userid } = req.body;
  const sql = `INSERT INTO selling (img, title, cate, price, status, \`desc\`, delivery, userid)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  connection.query(sql, [img, title, cate, price, status, desc, delivery, userid], (err, result) => {
    if (err){
      console.error(err);
      return res.status(500).json({ error: '상품 등록 실패' });
    }
      res.json({ id: result.insertId });
  });
});

// 상품 수정
app.post('/mypage/:id', (req, res) => {
  const { id } = req.params;
  const { img, title, cate, price, status, desc, delivery } = req.body;
  const sql = `UPDATE selling SET img=?, title=?, cate=?, price=?, status=?, \`desc\`=?, delivery=? WHERE id=?`;
  connection.query(sql, [img, title, cate, price, status, desc, delivery, id], err => {
    if (err) return res.status(500).json({ error: '상품 수정 실패' });
    res.json({ success: true });
  });
});

// 상품 삭제
app.delete('/selling/:id', (req, res) => {
  const { id } = req.params;
  connection.query('DELETE FROM selling WHERE id=?', [id], (err, result) => {
    if (err) return res.status(500).json({ error: '상품 삭제 실패' });
    res.json({ success: true });
  });
});

app.listen(port, ()=>{
    console.log('Listening...');
});
