const AWS = require('aws-sdk');
import { S3Event } from "aws-lambda";

exports.handler = async (event: S3Event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  const unprocessedBucketName = event.Records[0].s3.bucket.name;
  const inputKey = decodeURIComponent(
    event.Records[0].s3.object.key.replace(/\+/g, " ")
  );

  const unprocessedFilePath = `s3://${unprocessedBucketName}/${inputKey}`;
  const outPutKey = inputKey.split("/").slice(0, -1).join("/") + "/";
  const processedFilePath = `s3://${process.env.S3_BUCKET_PROCESSED_MEDIA}/${outPutKey}`;
  console.log("input key", inputKey)
  console.log("S3 Output URL", processedFilePath)
  console.log("S3 Bucket proc med", process.env.S3_BUCKET_PROCESSED_MEDIA)
  console.log("MediaConvert Role ARN", process.env.MEDIA_CONVERTER_ROLE_ARN)


  // Initialize MediaConvert
  const mediaConverter = new AWS.MediaConvert({ region: "us-east-1" });

  let endpoint;
  try {
    const endpointResponse = await mediaConverter.describeEndpoints().promise();
    endpoint = endpointResponse.Endpoints[0].Url;
  } catch (err) {
    console.error("Error getting MediaConvert endpoint:", err);
    throw err;
  }

  const mediaConvertClient = new AWS.MediaConvert({
    endpoint: endpoint,
    region: "us-east-1",
  });

  const params = {
    Role: process.env.MEDIA_CONVERTER_ROLE_ARN, // IAM role for MediaConvert
    Settings: {
      OutputGroups: [
        {
          Name: "Apple HLS",
          OutputGroupSettings: {
            Type: "HLS_GROUP_SETTINGS",
            HlsGroupSettings: {
              Destination: processedFilePath,
              SegmentLength: 1,
              MinSegmentLength: 0,
            },
          },
          Outputs: [
            {
              VideoDescription: {
                CodecSettings: {
                  Codec: "H_264",
                  H264Settings: {
                    RateControlMode: "QVBR",
                    SceneChangeDetect: "TRANSITION_DETECTION",
                    MaxBitrate: 2000000,
                  },
                },
              },
              AudioDescriptions: [
                {
                  AudioSourceName: "Audio Selector 1", // 🧠 Important link
                  CodecSettings: {
                    Codec: "AAC",
                    AacSettings: {
                      Bitrate: 96000,
                      CodingMode: "CODING_MODE_2_0",
                      SampleRate: 48000,
                    },
                  },
                },
              ],
              ContainerSettings: {
                Container: "M3U8",
              },
              NameModifier: "_hls",
            },
          ],
        },
      ],
      Inputs: [
        {
          FileInput: unprocessedFilePath,
          AudioSelectors: {
            "Audio Selector 1": {
              DefaultSelection: "DEFAULT"
            }
          }
        },
      ],
    },
  };

  try {
    const job = await mediaConvertClient.createJob(params).promise();
    console.log("MediaConvert job created:", job.Job.Id);
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "HLS MediaConvert job submitted",
        jobId: job.Job.Id,
      }),
    };
  } catch (error) {
    console.error("Failed to create MediaConvert job:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to create MediaConvert job" }),
    };
  }
};
