/*********************************************************************************
 *  WEB322 – Assignment 06
 *  I declare that this assignment is my own work in accordance with Seneca  Academic Policy.  No part of this
 *  assignment has been copied manually or electronically from any other source (including web sites) or
 *  distributed to other students.
 *
 *  Name: Maham Waqar Student ID: 127044196 Date: Sat, 10 Apr 2023
 *
 *  Online (Cyclic) Link: https://sleepy-underwear-boa.cyclic.app/blog
 ********************************************************************************/

const express = require("express");
const blogData = require("./blog-service");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const exphbs = require("express-handlebars");
const stripJs = require("strip-js");
const authData = require("./auth-service");
const clientSessions = require("client-sessions");

const app = express();

const HTTP_PORT = process.env.PORT || 8080;

app.use(clientSessions({
  cookieName: "session", // this is the object name that will be added to 'req'
  secret: "superSecretCode", // this should be a long un-guessable string.
  duration: 2 * 60 * 1000, // duration of the session in milliseconds (2 minutes)
  activeDuration: 1000 * 60 // the session will be extended by this many ms each request (1 minute)
}));

cloudinary.config({
  cloud_name: "dg8d270dm",
  api_key: "851739466863879",
  api_secret: "3BpFNM8Id4J7UUv5xCqfalu15pQ",
  secure: true,
});

app.use(function(req, res, next) {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (!req.session.user) {
    res.redirect("/login");
  } else {
    next();
  }
}

const upload = multer();

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      navLink: function(url, options) {
        return (
          "<li" +
          (url == app.locals.activeRoute ? ' class="active" ' : "") +
          '><a href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function(lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw "Handlebars Helper equal needs 2 parameters";
        if (lvalue != rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
      safeHTML: function(context) {
        return stripJs(context);
      },
      formatDate: function(dateObj) {
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      },
    },
  })
);

app.set("view engine", ".hbs");

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));

app.use(function(req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    route == "/" ? "/" : "/" + route.replace(/\/(.*)/, "");
  app.locals.viewingCategory = req.query.category;
  next();
});

app.get("/", (req, res) => {
  res.redirect("/blog");
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/blog", async (req, res) => {
  let viewData = {};
  try {
    let posts = [];
    if (req.query.category) {
      posts = await blogData.getPublishedPostsByCategory(req.query.category);
    } else {
      posts = await blogData.getPublishedPosts();
    }
    posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    let post = posts[0];
    viewData.posts = posts;
    viewData.post = post;
  } catch (err) {
    viewData.message = err;
  }
  try {
    let categories = await blogData.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }
  res.render("blog", { data: viewData });
});

app.get("/posts", ensureLogin, (req, res) => {
  let queryPromise = null;
  if (req.query.category) {
    queryPromise = blogData.getPostsByCategory(req.query.category);
  } else if (req.query.minDate) {
    queryPromise = blogData.getPostsByMinDate(req.query.minDate);
  } else {
    queryPromise = blogData.getAllPosts();
  }
  queryPromise
    .then((data) => {
      if (data.length > 0) {
        res.render("posts", { posts: data });
      } else {
        res.render("posts", { message: "" });
      }
    })
    .catch((err) => {
      res.render("posts", { message: err });
    });
});

app.post("/posts/add", [upload.single("featureImage"), ensureLogin], (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });
        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };
    async function upload(req) {
      let result = await streamUpload(req);
      return result;
    }
    upload(req).then((uploaded) => {
      processPost(uploaded.url);
    });
  } else {
    processPost("");
  }

  function processPost(imageUrl) {
    req.body.featureImage = imageUrl;
    blogData
      .addPost(req.body)
      .then((post) => {
        res.redirect("/posts");
      })
      .catch((err) => {
        res.status(500).send(err);
      });
  }
});

app.get("/categories/add", ensureLogin, (req, res) => {
  res.render("addCategory");
});

app.post("/categories/add", ensureLogin, (req, res) => {
  blogData
    .addCategory(req.body)
    .then((category) => {
      res.redirect("/categories");
    })
    .catch((err) => {
      res.status(500).send(err);
    });
});

app.get("/posts/add", ensureLogin, (req, res) => {
  blogData
    .getCategories()
    .then((data) => {
      res.render("addPost", { categories: data });
    })
    .catch(() => {
      res.render("addPost", { categories: [] });
    });
});

app.get("/posts/delete/:id", ensureLogin, (req, res) => {
  blogData
    .deletePostById(req.params.id)
    .then(() => {
      res.redirect("/posts");
    })
    .catch((err) => {
      res.status(500).send("Unable to Remove Post / Post not found");
    });
});

app.get("/post/:id", ensureLogin, (req, res) => {
  blogData
    .getPostById(req.params.id)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => {
      res.json({ message: err });
    });
});

app.get("/blog/:id", async (req, res) => {
  let viewData = {};
  try {
    let posts = [];
    if (req.query.category) {
      posts = await blogData.getPublishedPostsByCategory(req.query.category);
    } else {
      posts = await blogData.getPublishedPosts();
    }
    posts.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));
    viewData.posts = posts;
  } catch (err) {
    viewData.message = "no results";
  }
  try {
    viewData.post = await blogData.getPostById(req.params.id);
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    let categories = await blogData.getCategories();
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  res.render("blog", { data: viewData });
});

app.get("/categories", ensureLogin, (req, res) => {
  blogData
    .getCategories()
    .then((data) => {
      if (data.length > 0) {
        res.render("categories", { categories: data });
      } else {
        res.render("categories", { message: "no results" });
      }
    })
    .catch((err) => {
      res.render("categories", { message: "no results" });
    });
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/register', function(req, res) {
  res.render('register');
});

app.post('/register', function(req, res) {
  authData.RegisterUser(req.body)
    .then(function() {
      res.render('register', { successMessage: 'User created' });
    })
    .catch(function(err) {
      res.render('register', { errorMessage: err, userName: req.body.userName });
    });
});

app.post('/login', function(req, res) {
  req.body.userAgent = req.get('User-Agent');
  authData.CheckUser(req.body)
    .then(function(user) {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory
      };
      res.redirect('/posts');
    })
    .catch(function(err) {
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

app.get("/categories/delete/:id", ensureLogin, (req, res) => {
  blogData.deleteCategoryById(req.params.id)
    .then(() => {
      res.redirect('/categories');
    }).catch((err) => {
      res.status(500).send("Unable to Remove Category / Category Not Found");
    });
});


app.get('/logout', function(req, res) {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, function(req, res) {
  res.render('userHistory');
});


app.use((req, res) => {
  res.status(404).render("404");
});

blogData
  .initialize()
  .then(authData.initialize)
  .then(() => {
    app.listen(HTTP_PORT, () => {
      console.log("server listening on: " + HTTP_PORT);
    });
  })
  .catch((err) => {
    console.log(err);
  });
