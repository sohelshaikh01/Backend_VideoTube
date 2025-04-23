[
    {
        $group: { _id: "$uploadedBy", totalViews: { $sum: "$views"}}
    }
]

// Sum: Add all field values of videos,
// Count: Total Document
// Size: Size of an array 



// Error always while using $size that field is not an array
db.videos.aggregate([
    {

        $project: {
            username: 1,
            watchCount: { $size: "$watchHistory" }
        }
    }
])


db.users.aggregate([
   {
    $match: { username: "johndoe"}
   }, 
   {
    $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchedVideos"
    }
   },
   { 
    $project: {
        username: 1,
        watchedVideos: 1
    }
   }
])


// Find User watch videos
// It first get username
// Lookup each video details by Id

db.videos.aggregate([
    { $unwind: "$tags" },
    { $group: { _id: "$tags", count: { $sum: 1 }} }
])

// $unwind make arrays into documents
// $group count in each occurance


db.videos.aggregate([
    { $sort: { views: -1 } },
    { $limit: 2 }
])


db.videos.aggregate([
    {
        $addFields: {
            tagCount: { $size: "$tags" }
        }
    },
    {
        $limit: 2
    }
])


db.videos.aggregate([
    {
        $count: "videoCount"
    }
])

// Count total document in pipeline as videoCount

db.users.aggregate([
    {
        $match: { watchHistory: ObjectId("645a1b3e1c1c1c1c1c1c1c10") }
        // User who watched this video
    },
    {
        $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchedVideos"
        }
        // Data of each video
    }
])


db.videos.aggregate([
    {   
        // Running query in one pipelines
        $facet: {
            topVideos: [
                { $sort: { views: -1 } },
                { $limit: 2 }
            ],
            videoStats: [
                { $group: { _id: null, avgViews: { $avg: "$views" }, total: { $sum: 1} } }
            ]
            // This as array fields
        }
    }
])

// -------------------- Id but not createAt

db.users.aggregate([
    {
        $match: { avatar: { $exists: true } }
    },
    {
        $project: {
            username: 1,
            email: 1,
            createdAt: 1
        }
    },
    {
        $sort: { createdAt: -1 }
    }
])


// More Level Aggregations --------------------

db.videos.aggregate([
    {
        $group: {
            _id: "$uploadedBy",
            totalViews: { $sum: "$views"}
        }
        // Videos By User Id
    },
    {
        $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "uploader"
        }
        // Add Users Details Field
    },
    {
        $unwind: "$uploader",
        // From array to object
    },
    {
        $project: {
            _id: 0,
            username: "$uploader.username",
            fullName: "$uploader.fullName",
            totalViews: 1
        }
        // From the object as above
    },
    { $sort: { totalViews: -1}},
    { $limit: 3}

])


db.videos.aggregate([
    {
        $lookup: {
            from: "users",
            localField: "uploadedBy",
            foreignField: "_id",
            as: "uploader"
        }
        // Fetch the uploader data in array
    },
    {
        $unwind: "$uploader"
        // tranform array in object
    },
    {
        $addFields: {
            tagCount: { $size: "$tags"}
        }
    },
    {
        $project: {
            title: 1,
            views: 1,
            tagCount: 1,
            uploader: "$uploader.username"
        }
    },
])

// Size argument Problem Above -----------------------

db.users.aggregate([
    {
        $lookup: {
            from: "videos",
            localField: "watchHistory",
            foreignField: "_id",
            as: "watchVideos"
        }
    },
    {
        $project: {
            username: 1,
            watchCount: { $size: "$watchHistory" },
            watchedTitle: "$watchVideos.title"
        }
    }
])

// WatchVideos Title Not showing


db.customers.aggregate([
    { 
        $group: {
            _id: "$customerId",
            totalCounts: { $sum: "$amount"}
        }
    },
    {
        $sort: {
            customerId: -1
        }
    }
])


db.users.aggregate([
    {
        $lookup: {
            from: "videos",
            let: { _id: "$uploadedBy" },
            pipeline: [
               { $match: { $expr: { $eq: ["#userId", "$$userId"
            ]}}}]
        }
    }
])


db.users.aggregate([
    {
      $lookup: {
        from: "comments",
        let: { userId: "$_id" },
        pipeline: [
          { $match: { $expr: { $eq: ["$userId", "$$userId"] } } },
          { $sort: { createdAt: -1 } },
          { $limit: 1 }
        ],
        as: "latestComment"
      }
    },
    {
      $unwind: { path: "$latestComment", preserveNullAndEmptyArrays: true }
    }
  ])
  
