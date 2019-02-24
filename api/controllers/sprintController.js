const mongoose = require("mongoose"),
  Sprint = mongoose.model("Sprints"),
  Story = mongoose.model("Stories");
Estimation = mongoose.model("Estimations");

const io = require("../../app");

exports.createSprint = (req, res) => {
  const { stories } = req.body;
  const storyArray = stories.split("\n");
  delete req.body.stories;
  const newSprint = new Sprint({ ...req.body });

  newSprint.save((err, message) => {
    if (err) res.send(err);
    storyArray.map((storyName, index) => {
      const story = new Story({
        name: storyName,
        sprint: newSprint._id,
        estimations: [],
        ...(index === 0 && { status: "Active" })
      });
      story.save(function(err) {
        if (err) return handleError(err);
      });
      newSprint.stories.push(story);
    });
    io.emit("message", message);
    res.json(message);
  });
};

exports.finishStoryVoting = (req, res) => {
  const sprintId = req.body._id;
  if (sprintId) {
    const { finalEstimation, stories } = req.body;
    const nextStory = stories.find(story => story.status === "Not Voted");
    const activeStory = stories.find(story => story.status === "Active");

    if (activeStory) {
      Story.findByIdAndUpdate(
        activeStory._id,
        {
          ...activeStory,
          status: "Voted",
          finalEstimation: finalEstimation
        },
        { new: true },
        (err, story) => {
          if (err) {
            res.status(400);
            res.send(err);
          }
          io.emit("story", story);
        }
      );
    }
    if (nextStory) {
      Story.findByIdAndUpdate(
        nextStory._id,
        { ...nextStory, status: "Active" },
        { new: true },
        (err, story) => {
          if (err) {
            res.status(400);
            res.send(err);
          }
          io.emit("story", story);
          res.json(story);
        }
      );
    } else {
      res.json("err");
    }
  }
};

exports.createEstimation = (req, res) => {
  const storyId = req.body.story;
  const value = req.body.value;

  Story.findByIdAndUpdate(storyId, {}, { new: true }, (err, story) => {
    if (err) res.send(err);
    const estimation = new Estimation({
      value: value,
      story: storyId
    });
    estimation.save(function(err) {
      if (err) return handleError(err);
    });
    story.estimations.push(estimation);
    io.emit("story", story);
    res.json(story);
  });
};

exports.getSprint = (req, res) => {
  Sprint.findById(req.params.sprintId, (err, sprint) => {
    if (err) {
      res.status(400);
      res.send(err);
    }
    sprint &&
      Story.find({ sprint: sprint._id }, null, null, (err, stories) => {
        if (err) {
          res.status(400);
          res.send(err);
        }
        sprint.stories = [...stories];
        res.json(sprint);
      });
  });
};

exports.listAllSprints = async (req, res) => {
  Sprint.find({}, null, { sort: { created_date: -1 } }, (err, sprints) => {
    err && res.send(err);
    res.json(sprints);

    //   sprints.forEach(sprint => {
    //     Story.find({ sprint: sprint._id }, null, null, (err, stories) => {
    //       sprint.stories = [...stories];
    //     });
    //   });
  });
};

exports.updateSprint = (req, res) => {
  //   Sprint.findOneAndUpdate(
  //     { _id: req.params.sprint },
  //     req.body,
  //     { new: true },
  //     (err, message) => {
  //       if (err) res.send(err);
  //       res.json(message);
  //     }
  //   );
};

exports.deleteSprint = (req, res) => {
  Sprint.remove(
    {
      _id: req.params.sprintId
    },
    (err, message) => {
      if (err) res.send(err);
      res.json({ message: "Sprint successfully deleted" });
    }
  );
};
