//Last changed 11.7.2023 6:28 PM

const AWS = require("aws-sdk");
AWS.config.update( {
  region: "us-east-1"
});

const dynamodb = new AWS.DynamoDB.DocumentClient();
const dynamodbTableName = "Team_5_Products";

// Define paths - Liz Chandler 11/3/2023
const searchProductPath = "/products";
const searchOrderPath = "/orders";
const searchProductParamPath = "/products/{productID}";
const searchOrderParamPath = "/orders/:orderID";

// Switch based on functions for API call - Liz Chandler 11.6.2023
exports.handler = async function(event) {
  console.log("Request event method: ", event.httpMethod);
  console.log("EVENT\n" + JSON.stringify(event, null, 2));
  let response;
  switch(true) {
    /*Cases for product*/
    case event.httpMethod === "GET" && event.requestContext.resourcePath === searchProductPath:
    response = await getProducts();
     break;

   case event.httpMethod === "GET" && event.requestContext.resourcePath === searchProductParamPath:
    response = await getProduct(event.pathParameters.productID);
     break;

    case event.httpMethod === "POST" && event.requestContext.resourcePath === searchProductPath:
      response = await saveProduct(JSON.parse(event.body));
      break;

// This could be written as a method without either path or query parameters, but for the sake of simplicity, we left it this way anyway.
// In order to get PATCH to work without a path parameter, simply change line 40 to be `case event.httpMethod === "PATCH" && event.requestContext.resourcePath === searchProductPath:`
// Once done, go into API gateway, delete the PATCH method under /products/{productID}, and remake the method in the /products/ resource.
   case event.httpMethod === "PATCH" && event.requestContext.resourcePath === searchProductParamPath:
      const requestBody = JSON.parse(event.body);
      response = await modifyProduct(requestBody.productID, requestBody.updateKey, requestBody.updateValue);
      break;

    case event.httpMethod === "DELETE" && event.requestContext.resourcePath === searchProductParamPath:
      //response = await deleteUser(JSON.parse(event.body).id);
      response = await deleteProduct(event.pathParameters.productID);
      break;
    
    /*Cases for order
    case event.httpMethod === "GET" && event.requestContext.resourcePath === searchOrderPath:
    response = await getAllOrders(event.queryStringParameters.id);
     break;

   case event.httpMethod === "GET" && event.requestContext.resourcePath === searchOrderParamPath:
    response = await getOrder(event.pathParameters.id);
     break;

    case event.httpMethod === "POST" && event.requestContext.resourcePath === searchProductPath:
      response = await addOrder(JSON.parse(event.body));
      break;

   case event.httpMethod === "PATCH" && event.requestContext.resourcePath === searchProductPath:
      const requestBody = JSON.parse(event.body);
      response = await updateOrder(requestBody.id, requestBody.updateKey, requestBody.updateValue);
      break;
    */
    
    default:
      response = buildResponse(404, event.requestContext.resourcePath);
}

 return response;
}

//Garrett edited 11/3/23
//gets product from ID
async function getProduct(productID) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      "id": productID
    }
  }
  return await dynamodb.get(params).promise().then((response) => {
    return buildResponse(200, response.Item);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  });
} 

//gets all products
async function getProducts() {
  const params = {
    TableName: dynamodbTableName
  }
  const allProducts = await scanDynamoRecords(params, []);
  const body = {
    Products: allProducts
  }
  return buildResponse(200, body);
}

async function scanDynamoRecords(scanParams, itemArray) {
  try {
    const dynamoData = await dynamodb.scan(scanParams).promise();
    itemArray = itemArray.concat(dynamoData.Items);
    if (dynamoData.LastEvaluatedKey) {
      scanParams.ExclusiveStartkey = dynamoData.LastEvaluatedKey;
      return await scanDynamoRecords(scanParams, itemArray);
    }
    return itemArray;
  } catch(error) {
    console.error('Do your custom error handling here. I am just gonna log it: ', error);
  }
}

//edited by Jackson 11.3.2023 2:06 PM
//saves a product to the dynamoDB
async function saveProduct(requestBody) {
  const params = {
    TableName: dynamodbTableName,
    Item: requestBody
  }
  return await dynamodb.put(params).promise().then(() => {
    const body = {
      Operation: "SAVE",
      Message: "SUCCESS",
      Item: requestBody
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  })
}

/* Written by Louis Godfrey 11/06/2023
Deletes product assigned productID from data
*/
async function deleteProduct(productID)
{
  const params = {
    TableName: dynamodbTableName,
    Key: {
      "id": productID
    },
    ReturnValues: "ALL_OLD"
  }
  return await dynamodb.delete(params).promise().then((response) => {
    const body = {
      Operation: "DELETE",
      Message: "SUCCESS",
      Item: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("No product with the given ID was found", error);
  })
}

//edited by Tyler A. on 11/6/2023
//modifies an existing product
async function modifyProduct(productID, updateKey, updateValue) {
  const params = {
    TableName: dynamodbTableName,
    Key: {
      "id": productID
    },
    UpdateExpression: `set ${updateKey} = :value`,
    ExpressionAttributeValues: {
      ":value": updateValue
    },
    ReturnValues: "UPDATED_NEW"
  }
  return await dynamodb.update(params).promise().then((response) => {
    const body = {
      Operation: "UPDATE",
      Message: "SUCCESS",
      UpdatedAttributes: response
    }
    return buildResponse(200, body);
  }, (error) => {
    console.error("Do your custom error handling here. I am just gonna log it: ", error);
  })
}

//builds error response
function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
 }

}
