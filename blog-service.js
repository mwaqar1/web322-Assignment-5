const Sequelize = require('sequelize');
var sequelize = new Sequelize('tyqkirxi', 'tyqkirxi', '4V734Sb3Y5x2WDKFJ_T2KLgWfBLBd3lQ', {
  host: 'ruby.db.elephantsql.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
    ssl: { rejectUnauthorized: false }
  },
  query: { raw: true }
});

const Post = sequelize.define('Post', {
  body: Sequelize.TEXT,
  title: Sequelize.STRING,
  postDate: Sequelize.DATE,
  featureImage: Sequelize.STRING,
  published: Sequelize.BOOLEAN,
});

const Category = sequelize.define('Category', {
  category: Sequelize.STRING,
});

// Define the relationship between Post and Category
Post.belongsTo(Category, { foreignKey: 'category' });

module.exports.initialize = function() {
  return new Promise((resolve, reject) => {
    Post.sync()
      .then(() => Category.sync())
      .then(() => {
        console.log('Database synced successfully.');
        resolve();
      })
      .catch(error => {
        reject("Unable to sync the database: " + error.message);
      });
  });
}

module.exports.getAllPosts = function() {
  return new Promise((resolve, reject) => {
    // Find all posts
    Post.findAll()
      .then(posts => {
        if (posts.length === 0) {
          reject('no results');
        } else {
          resolve(posts);
        }
      })
      .catch(error => {
        reject("Unable to retrieve posts: " + error.message);
      });
  });
}

module.exports.getPostsByCategory = function(category) {
  return new Promise((resolve, reject) => {
    // Find all posts filtered by category
    Post.findAll({ where: { category } })
      .then(posts => {
        if (posts.length === 0) {
          reject('No posts found for the category.');
        } else {
          resolve(posts);
        }
      })
      .catch(error => {
        reject("Unable to retrieve posts: " + error.message);
      });
  });
}
module.exports.getPostsByMinDate = function(minDateStr) {
  return new Promise((resolve, reject) => {
    // Find all posts filtered by minDate
    const { gte } = Sequelize.Op;
    Post.findAll({ where: { postDate: { [gte]: new Date(minDateStr) } } })
      .then(posts => {
        if (posts.length === 0) {
          reject('No posts found after the minimum date.');
        } else {
          resolve(posts);
        }
      })
      .catch(error => {
        reject("Unable to retrieve posts: " + error.message);
      });
  });
}
module.exports.getPostById = function(id) {
  return new Promise((resolve, reject) => {
    // Find a post by id
    Post.findAll({ where: { id } })
      .then(posts => {
        if (posts.length === 0) {
          reject('No post found with the specified ID.');
        } else {
          resolve(posts[0]);
        }
      })
      .catch(error => {
        reject("Unable to retrieve post: " + error.message);
      });
  });
}
module.exports.addPost = function(postData) {
  return new Promise((resolve, reject) => {
    // Set published property
    postData.published = (postData.published) ? true : false;

    // Replace blank values with null
    for (const prop in postData) {
      if (postData[prop] === '') {
        postData[prop] = null;
      }
    }

    // Set postDate
    postData.postDate = new Date();

    // Create a new post
    Post.create(postData)
      .then(() => {
        resolve();
      })
      .catch(error => {
        reject("Unable to create post: " + error.message);
      });
  });
}
module.exports.getPublishedPosts = function() {
  return new Promise((resolve, reject) => {
    // Find all published posts
    Post.findAll({ where: { published: true } })
      .then(posts => {
        if (posts.length === 0) {
          reject('No published posts found.');
        } else {
          resolve(posts);
        }
      })
      .catch(error => {
        reject("Unable to retrieve posts: " + error.message);
      });
  });
}

module.exports.getPublishedPostsByCategory = function(category) {
  return new Promise((resolve, reject) => {
    // Find all published posts by category
    Post.findAll({ where: { published: true, category } })
      .then(posts => {
        if (posts.length === 0) {
          reject('No published posts found for the specified category.');
        } else {
          resolve(posts);
        }
      })
      .catch(error => {
        reject("Unable to retrieve posts: " + error.message);
      });
  });
}
module.exports.getCategories = function() {
  return new Promise((resolve, reject) => {
    // Find all categories
    Category.findAll()
      .then(categories => {
        if (categories.length === 0) {
          reject('No categories found.');
        } else {
          resolve(categories);
        }
      })
      .catch(error => {
        reject("Unable to retrieve categories: " + error.message);
      });
  });
}
//WS5 functions 

module.exports.addCategory = function(categoryData) {
  return new Promise((resolve, reject) => {
    // Replace any blank values with null
    for (const prop in Category) {
      if (Category[prop] === '') {
        Category[prop] = null;
      }
    }

    // Create the new category
    Category.create(categoryData)
      .then(() => {
        resolve('Category created successfully.');
      })
      .catch(error => {
        reject("Unable to create category: " + error.message);
      });
  });
}


module.exports.deleteCategoryById = function(id) {
  return new Promise((resolve, reject) => {
    Category.destroy({ where: { id } })
      .then(rowsDeleted => {
        if (rowsDeleted === 0) {
          reject(`No category with id ${id} found.`);
        } else {
          resolve(`Category with id ${id} was deleted successfully.`);
        }
      })
      .catch(error => {
        reject(`Unable to delete category with id ${id}: ${error.message}`);
      });
  });
}

module.exports.deletePostById = function(id) {
  return new Promise((resolve, reject) => {
    Post.destroy({ where: { id } })
      .then(rowsDeleted => {
        if (rowsDeleted === 0) {
          reject(`No post with id ${id} found.`);
        } else {
          resolve(`Post with id ${id} was deleted successfully.`);
        }
      })
      .catch(error => {
        reject(`Unable to delete post with id ${id}: ${error.message}`);
      });
  });
}

