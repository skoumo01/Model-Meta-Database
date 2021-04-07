const http = require('http')
const fs = require('fs')

function tflite_example(){ // ~12 MB
	let model_tflite = fs.readFileSync('./data/TF/TFLite/lite-model_spice_1.tflite', {encoding: 'base64'});
	let data = JSON.stringify({
		"token": "token",
		"data": {
			"id": "tflite_example",
			"tag1":"tag1",
			"tag2":"tag2",
			"serialization_encoding":"base64",
			"model": [
				{
					"metadata":
					{
						"identifier":"lite-model_spice_1",
						"original_format":"tflite"
					},
					"serialized_data": model_tflite
				}
			],
			"weights":[ ],
			"initialization":[ ],
			"checkpoints":[ ]
		}
	})
	
	return data;
}

function tfjs_example(id){ // ~8 MB
	let shard1 = fs.readFileSync('./data/TF/TFjs/group1-shard1of3.bin', {encoding: 'base64'});
	let shard2 = fs.readFileSync('./data/TF/TFjs/group1-shard2of3.bin', {encoding: 'base64'});
	let shard3 = fs.readFileSync('./data/TF/TFjs/group1-shard3of3.bin', {encoding: 'base64'});
	let model = fs.readFileSync('./data/TF/TFjs/model.json', {encoding: 'base64'});
	let data = JSON.stringify({
		"token": "token",
		"data": {
			"id": id,
			"tag1":"tag1",
			"tag2":"tag2",
			"serialization_encoding":"base64",
			"model": [
				{
					"metadata":
					{
						"identifier":"group1-shard1of3",
						"original_format":"bin"
					},
					"serialized_data": shard1
				},
				{
					"metadata":
					{
						"identifier":"group1-shard2of3",
						"original_format":"bin"
					},
					"serialized_data": shard2
				},
				{
					"metadata":
					{
						"identifier":"group1-shard3of3",
						"original_format":"bin"
					},
					"serialized_data": shard3
				},
				{
					"metadata":
					{
						"identifier":"model",
						"original_format":"json"
					},
					"serialized_data": model
				}
			],
			"weights":[ ],
			"initialization":[ ],
			"checkpoints":[ ]
		}
	})
	
	return data;
}

function tf_saved_model_example_normal(){// ~90 MB
	let var1 = fs.readFileSync('./data/TF/SavedModel/normal/variables/variables.data-00000-of-00001', {encoding: 'base64'});
	let var2 = fs.readFileSync('./data/TF/SavedModel/normal/variables/variables.index', {encoding: 'base64'});
	let saved_model = fs.readFileSync('./data/TF/SavedModel/normal/saved_model.pb', {encoding: 'base64'});
	let data = JSON.stringify({
		"token": "token",
		"data": {
			"id": "tf_saved_model_example_normal",
			"tag1":"tag1",
			"tag2":"tag2",
			"serialization_encoding":"base64",
			"model": [
				{
					"metadata":
					{
						"identifier":"saved_model",
						"original_format":"pb"
					},
					"serialized_data": saved_model
				}
			],
			"weights":[ ],
			"initialization":[ ],
			"checkpoints":[
				{
					"metadata":
					{
						"identifier":"variables",
						"original_format":"data-00000-of-00001"
					},
					"serialized_data": var1
				},
				{
					"metadata":
					{
						"identifier":"variables",
						"original_format":"index"
					},
					"serialized_data": var2
				}				
			]
		}
	})
	
	return data;
}

function tf_saved_model_example_big(){ // ~400 MB
	let vocab = fs.readFileSync('./data/TF/SavedModel/big/assets/vocab.txt', {encoding: 'base64'});
	let var1 = fs.readFileSync('./data/TF/SavedModel/big/variables/variables.data-00000-of-00001', {encoding: 'base64'});
	let var2 = fs.readFileSync('./data/TF/SavedModel/big/variables/variables.index', {encoding: 'base64'});
	let saved_model = fs.readFileSync('./data/TF/SavedModel/big/saved_model.pb', {encoding: 'base64'});
	let tfhub_module = fs.readFileSync('./data/TF/SavedModel/big/tfhub_module.pb', {encoding: 'base64'});
	let data = JSON.stringify({
		"token": "token",
		"data": {
			"id": "tf_saved_model_example_big",
			"tag1":"tag1",
			"tag2":"tag2",
			"serialization_encoding":"base64",
			"model": [
				{
					"metadata":
					{
						"identifier":"saved_model",
						"original_format":"pb"
					},
					"serialized_data": saved_model
				},
				{
					"metadata":
					{
						"identifier":"tfhub_module",
						"original_format":"pb"
					},
					"serialized_data": tfhub_module
				}
			],
			"weights":[ ],
			"initialization":[
				{
					"metadata":
					{
						"identifier":"vocab",
						"original_format":"txt"
					},
					"serialized_data": vocab
				}
			],
			"checkpoints":[
				{
					"metadata":
					{
						"identifier":"variables",
						"original_format":"data-00000-of-00001"
					},
					"serialized_data": var1
				},
				{
					"metadata":
					{
						"identifier":"variables",
						"original_format":"index"
					},
					"serialized_data": var2
				}				
			]
		}
	})
	
	return data;
}

function darknet_yolo(){ // ~200 MB
	let architecture = fs.readFileSync('./data/DarknetYOLO/yolov2-tiny.cfg', {encoding: 'base64'});
	let weights = fs.readFileSync('./data/DarknetYOLO/yolov2-tiny.weights', {encoding: 'base64'});
	let data = JSON.stringify({
		"token": "token",
		"data": {
			"id": "darknet_yolo",
			"tag1":"tag1",
			"tag2":"tag2",
			"serialization_encoding":"base64",
			"model": [
				{
					"metadata":
					{
						"identifier":"yolov2-tiny",
						"original_format":"cfg"
					},
					"serialized_data": architecture
				}
			],
			"weights":[
				{
					"metadata":
					{
						"identifier":"yolov2-tiny",
						"original_format":"weights"
					},
					"serialized_data": weights
				}
			],
			"initialization":[ ],
			"checkpoints":[ ]
		}
	})
	
	return data;
}

function submit(){
	
	var data = darknet_yolo();

	const options = {
	  hostname: '10.16.30.89',
	  port: 3000,
	  path: '/model/submit',
	  method: 'PUT',
	  headers: {
		'Content-Type': 'application/json',
		'Content-Length': data.length
	  }
	}

	const req = http.request(options, res => {
	  console.log(`statusCode: ${res.statusCode}`)

	  res.on('data', d => {
		console.log(d.toString());
	  })
	})

	req.on('error', error => {
	  console.error(error)
	})

	req.write(data)
	req.end()
}

function retrieve(){

	var model_id = 'tf_saved_model_example_normal';

	const options = {
		hostname: '10.16.30.89',
		port: 3000,
		path: '/model?id='+model_id+'&token=token',
		method: 'GET'
	  }
	  
	  const req = http.request(options, res => {
		console.log(`statusCode: ${res.statusCode}`)
	  
		res.on('data', d => {
		  process.stdout.write(d)
		})
	  })
	  
	  req.on('error', error => {
		console.error(error)
	  })
	  
	  req.end()

}

submit()
//retrieve();