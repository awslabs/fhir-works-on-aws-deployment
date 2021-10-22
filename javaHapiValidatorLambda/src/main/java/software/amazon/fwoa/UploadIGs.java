package software.amazon.fwoa;

import java.io.OutputStreamWriter;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.ArrayList;
import java.util.List;

import io.github.classgraph.ClassGraph;
import io.github.classgraph.ResourceList;
import io.github.classgraph.ScanResult;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.CloudFormationCustomResourceEvent;
import com.amazonaws.services.s3.AmazonS3;
import com.amazonaws.services.s3.AmazonS3ClientBuilder;
import com.amazonaws.services.s3.model.ListObjectsV2Request;
import com.amazonaws.services.s3.model.ListObjectsV2Result;
import com.amazonaws.services.s3.model.S3ObjectSummary;

public class UploadIGs implements RequestHandler<Map<String, Object>, Context> {

    private static final AmazonS3 s3 = AmazonS3ClientBuilder.standard().build();

    @Override
    public Context handleRequest(Map<String, Object> input, Context context) {
        String requestType = (String)input.get("RequestType");
        @SuppressWarnings("unchecked")
        String bucketName = (String)((Map<String, Object>)input.get("ResourceProperties")).get("BucketName");

        try {
            if (bucketName == null) {
                throw new Error("could not find implementation guide bucket!");
            }
            ResourceList filenamesAndPaths = getJSONFilesInDir("implementationGuides");
            if (requestType == "Create") {
                for (int i = 0; i < filenamesAndPaths.size(); i++) {
                    s3.putObject(bucketName, filenamesAndPaths.get(i).getPath(), filenamesAndPaths.get(i).getContentAsString());
                }
                System.out.println("successfully uploaded implementation guides to S3");
                sendCfnResponse(input, context, "SUCCESS", "");
            } else if (requestType == "Update") {
                System.out.println("Updating implementation Guides ...");
                List<String> keysInBucket = getBucketObjects(bucketName);
                // remove all items that aren't present anymore from s3 bucket
                keysInBucket.removeAll(filenamesAndPaths.getPaths()); 
                for (int i = 0; i < keysInBucket.size(); i++) {
                    s3.deleteObject(bucketName, keysInBucket.get(i));
                }
                // update current objects
                for (int i = 0; i < filenamesAndPaths.size(); i++) {
                    s3.putObject(bucketName, filenamesAndPaths.get(i).getPath(), filenamesAndPaths.get(i).getContentAsString());
                }
                System.out.println("successfully updated implementation guides to S3");
                sendCfnResponse(input, context, "SUCCESS", "");
            } else { // Delete event
                System.out.println("Deleting all implementation Guides from S3");
                List<String> keys = getBucketObjects(bucketName);
                for (int i = 0; i < keys.size(); i++) {
                    s3.deleteObject(bucketName, keys.get(i));
                }
                System.out.println("successfully deleted implementation guides from S3");
                sendCfnResponse(input, context, "SUCCESS", "");
            }
        } catch (Exception e) {
            sendCfnResponse(input, context, "FAILED", e.getMessage());
        }
        return null;
    }

    private ResourceList getJSONFilesInDir(String implementationGuidesFolder) {
        try (ScanResult allFiles = new ClassGraph().acceptPaths(implementationGuidesFolder).rejectPaths(implementationGuidesFolder + "/*/*").scan()) {
            return allFiles.getResourcesWithExtension("json");
        } catch (Exception e) {
            throw e;
        }
    }

    private List<String> getBucketObjects(String bucketName) {
        try {
            List<String> objectKeys = new ArrayList<String>();
            ListObjectsV2Request req = new ListObjectsV2Request().withBucketName(bucketName);
            ListObjectsV2Result result;
            do {
                result = s3.listObjectsV2(req);

                for (S3ObjectSummary objectSummary : result.getObjectSummaries()) {
                    objectKeys.add(objectSummary.getKey());
                }
                // If there are more than maxKeys keys in the bucket, get a continuation token
                // and list the next objects.
                String token = result.getNextContinuationToken();
                req.setContinuationToken(token);
            } while (result.isTruncated());
            return objectKeys;
        } catch (Exception e) {
            throw new Error(e);
        }
    }
    
    private void sendCfnResponse(Map<String, Object> input, Context context, String status, String errorMessage) {
        String responseURL = (String)input.get("ResponseURL");
        try {
            URL url = new URL(responseURL);
            HttpURLConnection connection=(HttpURLConnection)url.openConnection();
            connection.setDoOutput(true);
            connection.setRequestMethod("PUT");
            OutputStreamWriter out = new OutputStreamWriter(connection.getOutputStream());
            CloudFormationCustomResourceEvent cloudFormationJsonResponse = new CloudFormationCustomResourceEvent();
            cloudFormationJsonResponse.setPhysicalResourceId("implementationGuides");
            cloudFormationJsonResponse.setLogicalResourceId((String)input.get("LogicalResourceId"));
            cloudFormationJsonResponse.setRequestId((String)input.get("RequestId"));
            cloudFormationJsonResponse.setStackId((String)input.get("StackId"));
            out.write(cloudFormationJsonResponse.toString());
            out.close();
            int responseCode = connection.getResponseCode();
            context.getLogger().log("Response Code: " + responseCode);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
