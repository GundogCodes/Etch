const Forum = require("../models/forums.cjs");
const User = require("../models/user.cjs");
const Post = require("../models/post.cjs");
const Comment = require("../models/comment.cjs");
const Chat = require("../models/chat.cjs");

exports.showAllForums = async (req, res) => {
  try {
    const forumList = await Forum.find({});

    res.json(forumList);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.createNewForum = async (req, res) => {
  try {
    //check if forum topic already exists: if it does no new forum else create forum
    // console.log('*****************REQUEST*****************', req.user._id)

    const foundingUser = await User.findOne({ _id: req.user._id });
    const forumCheck = await Forum.findOne({ topic: req.body.topic });
    // console.log('forum check: ', forumCheck)
    if (!foundingUser) {
      res.json("please login or create an account to create a Quarry");
    } else if (forumCheck) {
      res.json({
        message: "Quarry already exists!",
        Quarry: forumCheck,
      });
    } else {
      //console.log(req.user)
      const newForum = await Forum.create(req.body);
      newForum.founder = foundingUser;
      newForum.members.addToSet(foundingUser);
      newForum.numOfMembers++;
      await newForum.save();

      await User.findOneAndUpdate(
        { _id: req.user._id },
        { $addToSet: { foundedForums: newForum } },
        { new: true }
      );
      await User.findOneAndUpdate(
        { _id: req.user._id },
        { $addToSet: { followedForums: newForum } },
        { new: true }
      );
      res.json({ newForum });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.updateForumInfo = async (req, res) => {
  try {
    const foundForum = await Forum.findOne({ _id: req.params.id }).populate(
      "founder"
    );
    const checkUser = await User.findOne({ _id: req.user._id });
    //console.log('checkUser', checkUser)
    //console.log('foundForum founder', foundForum.founder)
    if (checkUser.email === foundForum.founder.email) {
      const updatedForum = await Forum.findOneAndUpdate(
        { _id: foundForum._id },
        req.body,
        { new: true }
      );
      res.json(updatedForum);
    } else {
      res.json("You Are Not Authorized to Edit this Quarry");
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.showAforum = async (req, res) => {
  try {
    const forum = await Forum.findOne({ _id: req.params.id })
      .populate("posts")
      .populate("founder");
    const forumPosts = await Post.find({ forum: forum._id }).populate("sender");
    res.json(forum);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteAForum = async (req, res) => {
  try {
    const foundForum = await Forum.findOne({ _id: req.params.id }).populate(
      "founder"
    );
    if (!foundForum) {
      res.json("Quarry doesnt exist");
    }
    const checkUser = await User.findOne({ _id: req.user._id });
    if (checkUser.email === foundForum.founder.email) {
      await User.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { foundedForums: foundForum._id } },
        { new: true }
      );
      await User.updateMany({ $pull: { followedForums: foundForum._id } });
      await Forum.findOneAndDelete({ _id: foundForum._id });
      res.json("Quarry Destoryed");
    } else {
      res.json("You Are Not Authorized to Destory this Quarry");
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.addAMember = async (req, res) => {
  try {
    if (!req.user) {
      res.json("please login to continue");
    } else {
      const newForum = await Forum.findOneAndUpdate(
        { _id: req.params.id },
        { $inc: { numOfMembers: 1 }, $addToSet: { members: req.user._id } },
        { new: true }
      )
        .populate("founder")
        .populate("posts");
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $addToSet: { followedForums: req.params.id } },
        { new: true }
      )
        .populate("friends")
        .populate("followedForums")
        .populate("posts")
        .populate("chats");
      res.json({ updatedForum: newForum, updatedUser: updatedUser });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
exports.removeAMember = async (req, res) => {
  try {
    if (!req.user) {
      res.json("please login to continue");
    } else {
      const newForum = await Forum.findOneAndUpdate(
        { _id: req.params.id },
        { $inc: { numOfMembers: -1 }, $pull: { members: req.user._id } },
        { new: true }
      )
        .populate("founder")
        .populate("posts");
      const updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { followedForums: req.params.id } },
        { new: true }
      )
        .populate("friends")
        .populate("followedForums")
        .populate("posts")
        .populate("chats");
      res.json({ updatedForum: newForum, updatedUser: updatedUser });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

exports.postToForum = async (req, res) => {
  try {
    if (!req.user) {
      res.json("Please login to continue");
    } else {
      const postingForum = await Forum.findOne({ _id: req.params.id });
      const newPost = {};
      newPost.sender = req.user;
      newPost.forum = postingForum;
      newPost.text = req.body.text;
      newPost.title = req.body.title;
      newPost.image = req.body.image;
      const createdPost = await Post.create(newPost);
      const updatedForum = await Forum.findOneAndUpdate(
        { _id: req.params.id },
        { $addToSet: { posts: createdPost } },
        { new: true }
      ).populate("posts");
      await User.findOneAndUpdate(
        { _id: req.user._id },
        { $inc: { numOfPosts: 1 }, $addToSet: { posts: createdPost } },
        { new: true }
      );
      res.json(updatedForum);
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
