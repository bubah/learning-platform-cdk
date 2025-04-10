const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const mediaConvert = new AWS.MediaConvert({
  endpoint: process.env.MEDIA_CONVERT_ENDPOINT, // MediaConvert service endpoint
});

exports.handler = async (event) => {
  const bucketA = process.env.S3_BUCKET_A;
  const bucketB = process.env.S3_BUCKET_B;

  const record = event.Records[0];
  const inputKey = record.s3.object.key;
  const outputPrefix = 'hls_output/';  // Where to store HLS files in S3(B)

  const jobSettings = {
    Role: 'arn:aws:iam::your-account-id:role/MediaConvertRole',  // Replace with your IAM Role ARN
    Settings: {
      OutputGroups: [
        {
          OutputGroupSettings: {
            Type: 'HLS_GROUP',
            HlsGroupSettings: {
              Destination: `s3://${bucketB.bucketName}/${outputPrefix}`,
              SegmentLength: 10, // Segment length for HLS (seconds)
            },
          },
          Outputs: [
            {
              Preset: 'System-Ott_Hls_16x9_1080p_16x9',  // Use a preset for HLS, or create custom one
              NameModifier: '_hls',
              ContainerSettings: {
                Container: 'M3U8',
              },
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    Profile: 'MAIN',
                    Level: 'LEVEL_4_2',
                  },
                },
              },
            },
          ],
        },
      ],
      Inputs: [
        {
          FileInput: `s3://${bucketA.bucketName}/${inputKey}`,
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: 'DEFAULT',
            },
          },
          VideoSelector: {
            ColorSpace: 'FOLLOW',
          },
        },
      ],
    },
  };

  try {
    const response = await mediaConvert.createJob(jobSettings).promise();
    console.log('MediaConvert Job created:', response);
    return {
      statusCode: 200,
      body: 'MediaConvert job initiated successfully.',
    };
  } catch (error) {
    console.error('Error creating MediaConvert job:', error);
    return {
      statusCode: 500,
      body: 'Error initiating MediaConvert job.',
    };
  }
};
