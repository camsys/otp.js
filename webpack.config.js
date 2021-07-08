var path = require('path');
var webpack = require('webpack')

module.exports =
  {
    entry: './src/client.js',
    output: {
      filename: 'build.js',
      path: path.resolve(__dirname, 'dist/'),
    },
    node: {
      fs: 'empty'
    },
    module: {
     rules: [
       {
         test: /\.handlebars$/,
         loader: "handlebars-loader",
         query: {
           knownHelpersOnly: false
         },
        },
        {
          test: /\.css$/,
          loader: "style-loader!css-loader"
        },
        {
          test: /\.(jpg|png|svg)$/,
          loader: 'url-loader'
        },
        {
          test: /\.html$/,
          loader: 'file-loader?name=[name].[ext]'
        },
        {
          test: /\.(json|geojson)$/,
          loader: 'json-loader'
        },
	      {
    	    test: /\.(woff|woff2|eot|ttf|otf)$/,
       	  loader: "file-loader"
        }
     ]
   },
   externals: {
     jquery: 'jQuery'
   }
  }
