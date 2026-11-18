( function () {

	class GLTFLoader extends THREE.Loader {

		constructor( manager ) {

			super( manager );
			this.dracoLoader = null;
			this.ktx2Loader = null;
			this.meshoptDecoder = null;
			this.pluginCallbacks = [];
			this.register( function ( parser ) {

				return new GLTFMaterialsClearcoatExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFTextureBasisUExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFTextureWebPExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMaterialsTransmissionExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFLightsExtension( parser );

			} );
			this.register( function ( parser ) {

				return new GLTFMeshoptCompression( parser );

			} );

		}

		load( url, onLoad, onProgress, onError ) {

			const scope = this;
			let resourcePath;

			if ( this.resourcePath !== '' ) {

				resourcePath = this.resourcePath;

			} else if ( this.path !== '' ) {

				resourcePath = this.path;

			} else {

				resourcePath = THREE.LoaderUtils.extractUrlBase( url );

			} // Tells the LoadingManager to track an extra item, which resolves after
			// the model is fully loaded. This means the count of items loaded will
			// be incorrect, but ensures manager.onLoad() does not fire early.


			this.manager.itemStart( url );

			const _onError = function ( e ) {

				if ( onError ) {

					onError( e );

				} else {

					console.error( e );

				}

				scope.manager.itemError( url );
				scope.manager.itemEnd( url );

			};

			const loader = new THREE.FileLoader( this.manager );
			loader.setPath( this.path );
			loader.setResponseType( 'arraybuffer' );
			loader.setRequestHeader( this.requestHeader );
			loader.setWithCredentials( this.withCredentials );
			loader.load( url, function ( data ) {

				try {

					scope.parse( data, resourcePath, function ( gltf ) {

						onLoad( gltf );
						scope.manager.itemEnd( url );

					}, _onError );

				} catch ( e ) {

					_onError( e );

				}

			}, onProgress, _onError );

		}

		setDRACOLoader( dracoLoader ) {

			this.dracoLoader = dracoLoader;
			return this;

		}

		setDDSLoader() {

			throw new Error( 'THREE.GLTFLoader: "MSFT_texture_dds" no longer supported. Please update to "KHR_texture_basisu".' );

		}

		setKTX2Loader( ktx2Loader ) {

			this.ktx2Loader = ktx2Loader;
			return this;

		}

		setMeshoptDecoder( meshoptDecoder ) {

			this.meshoptDecoder = meshoptDecoder;
			return this;

		}

		register( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) === - 1 ) {

				this.pluginCallbacks.push( callback );

			}

			return this;

		}

		unregister( callback ) {

			if ( this.pluginCallbacks.indexOf( callback ) !== - 1 ) {

				this.pluginCallbacks.splice( this.pluginCallbacks.indexOf( callback ), 1 );

			}

			return this;

		}

		parse( data, path, onLoad, onError ) {

			let content;
			const extensions = {};
			const plugins = {};

			if ( typeof data === 'string' ) {

				content = data;

			} else {

				const magic = THREE.LoaderUtils.decodeText( new Uint8Array( data, 0, 4 ) );

				if ( magic === BINARY_EXTENSION_HEADER_MAGIC ) {

					try {

						extensions[ EXTENSIONS.KHR_BINARY_GLTF ] = new GLTFBinaryExtension( data );

					} catch ( error ) {

						if ( onError ) onError( error );
						return;

					}

					content = extensions[ EXTENSIONS.KHR_BINARY_GLTF ].content;

				} else {

					content = THREE.LoaderUtils.decodeText( new Uint8Array( data ) );

				}

			}

			const json = JSON.parse( content );

			if ( json.asset === undefined || json.asset.version[ 0 ] < 2 ) {

				if ( onError ) onError( new Error( 'THREE.GLTFLoader: Unsupported asset. glTF versions >=2.0 are supported.' ) );
				return;

			}

			const parser = new GLTFParser( json, {
				path: path || this.resourcePath || '',
				crossOrigin: this.crossOrigin,
				requestHeader: this.requestHeader,
				manager: this.manager,
				ktx2Loader: this.ktx2Loader,
				meshoptDecoder: this.meshoptDecoder
			} );
			parser.fileLoader.setRequestHeader( this.requestHeader );

			for ( let i = 0; i < this.pluginCallbacks.length; i ++ ) {

				const plugin = this.pluginCallbacks[ i ]( parser );
				plugins[ plugin.name ] = plugin; // Workaround to avoid determining as unknown extension
				// in addUnknownExtensionsToUserData().
				// Remove this workaround if we move all the existing
				// extension handlers to plugin system

				extensions[ plugin.name ] = true;

			}

			if ( json.extensionsUsed ) {

				for ( let i = 0; i < json.extensionsUsed.length; ++ i ) {

					const extensionName = json.extensionsUsed[ i ];
					const extensionsRequired = json.extensionsRequired || [];

					switch ( extensionName ) {

						case EXTENSIONS.KHR_MATERIALS_UNLIT:
							extensions[ extensionName ] = new GLTFMaterialsUnlitExtension();
							break;

						case EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS:
							extensions[ extensionName ] = new GLTFMaterialsPbrSpecularGlossinessExtension();
							break;

						case EXTENSIONS.KHR_DRACO_MESH_COMPRESSION:
							extensions[ extensionName ] = new GLTFDracoMeshCompressionExtension( json, this.dracoLoader );
							break;

						case EXTENSIONS.KHR_TEXTURE_TRANSFORM:
							extensions[ extensionName ] = new GLTFTextureTransformExtension();
							break;

						case EXTENSIONS.KHR_MESH_QUANTIZATION:
							extensions[ extensionName ] = new GLTFMeshQuantizationExtension();
							break;

						default:
							if ( extensionsRequired.indexOf( extensionName ) >= 0 && plugins[ extensionName ] === undefined ) {

								console.warn( 'THREE.GLTFLoader: Unknown extension "' + extensionName + '".' );

							}

					}

				}

			}

			parser.setExtensions( extensions );
			parser.setPlugins( plugins );
			parser.parse( onLoad, onError );

		}

	}
	/* GLTFREGISTRY */


	function GLTFRegistry() {

		let objects = {};
		return {
			get: function ( key ) {

				return objects[ key ];

			},
			add: function ( key, object ) {

				objects[ key ] = object;

			},
			remove: function ( key ) {

				delete objects[ key ];

			},
			removeAll: function () {

				objects = {};

			}
		};

	}
	/*********************************/

	/********** EXTENSIONS ***********/

	/*********************************/


	const EXTENSIONS = {
		KHR_BINARY_GLTF: 'KHR_binary_glTF',
		KHR_DRACO_MESH_COMPRESSION: 'KHR_draco_mesh_compression',
		KHR_LIGHTS_PUNCTUAL: 'KHR_lights_punctual',
		KHR_MATERIALS_CLEARCOAT: 'KHR_materials_clearcoat',
		KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS: 'KHR_materials_pbrSpecularGlossiness',
		KHR_MATERIALS_TRANSMISSION: 'KHR_materials_transmission',
		KHR_MATERIALS_UNLIT: 'KHR_materials_unlit',
		KHR_TEXTURE_BASISU: 'KHR_texture_basisu',
		KHR_TEXTURE_TRANSFORM: 'KHR_texture_transform',
		KHR_MESH_QUANTIZATION: 'KHR_mesh_quantization',
		EXT_TEXTURE_WEBP: 'EXT_texture_webp',
		EXT_MESHOPT_COMPRESSION: 'EXT_meshopt_compression'
	};
	/**
	 * Punctual Lights Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_lights_punctual
	 */

	class GLTFLightsExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_LIGHTS_PUNCTUAL; // THREE.Object3D instance caches

			this.cache = {
				refs: {},
				uses: {}
			};

		}

		_markDefs() {

			const parser = this.parser;
			const nodeDefs = this.parser.json.nodes || [];

			for ( let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

				const nodeDef = nodeDefs[ nodeIndex ];

				if ( nodeDef.extensions && nodeDef.extensions[ this.name ] && nodeDef.extensions[ this.name ].light !== undefined ) {

					parser._addNodeRef( this.cache, nodeDef.extensions[ this.name ].light );

				}

			}

		}

		_loadLight( lightIndex ) {

			const parser = this.parser;
			const cacheKey = 'light:' + lightIndex;
			let dependency = parser.cache.get( cacheKey );
			if ( dependency ) return dependency;
			const json = parser.json;
			const extensions = json.extensions && json.extensions[ this.name ] || {};
			const lightDefs = extensions.lights || [];
			const lightDef = lightDefs[ lightIndex ];
			let lightNode;
			const color = new THREE.Color( 0xffffff );
			if ( lightDef.color !== undefined ) color.fromArray( lightDef.color );
			const range = lightDef.range !== undefined ? lightDef.range : 0;

			switch ( lightDef.type ) {

				case 'directional':
					lightNode = new THREE.DirectionalLight( color );
					lightNode.target.position.set( 0, 0, - 1 );
					lightNode.add( lightNode.target );
					break;

				case 'point':
					lightNode = new THREE.PointLight( color );
					lightNode.distance = range;
					break;

				case 'spot':
					lightNode = new THREE.SpotLight( color );
					lightNode.distance = range; // Handle spotlight properties.

					lightDef.spot = lightDef.spot || {};
					lightDef.spot.innerConeAngle = lightDef.spot.innerConeAngle !== undefined ? lightDef.spot.innerConeAngle : 0;
					lightDef.spot.outerConeAngle = lightDef.spot.outerConeAngle !== undefined ? lightDef.spot.outerConeAngle : Math.PI / 4.0;
					lightNode.angle = lightDef.spot.outerConeAngle;
					lightNode.penumbra = 1.0 - lightDef.spot.innerConeAngle / lightDef.spot.outerConeAngle;
					lightNode.target.position.set( 0, 0, - 1 );
					lightNode.add( lightNode.target );
					break;

				default:
					throw new Error( 'THREE.GLTFLoader: Unexpected light type: ' + lightDef.type );

			} // Some lights (e.g. spot) default to a position other than the origin. Reset the position
			// here, because node-level parsing will only override position if explicitly specified.


			lightNode.position.set( 0, 0, 0 );
			lightNode.decay = 2;
			if ( lightDef.intensity !== undefined ) lightNode.intensity = lightDef.intensity;
			lightNode.name = parser.createUniqueName( lightDef.name || 'light_' + lightIndex );
			dependency = Promise.resolve( lightNode );
			parser.cache.add( cacheKey, dependency );
			return dependency;

		}

		createNodeAttachment( nodeIndex ) {

			const self = this;
			const parser = this.parser;
			const json = parser.json;
			const nodeDef = json.nodes[ nodeIndex ];
			const lightDef = nodeDef.extensions && nodeDef.extensions[ this.name ] || {};
			const lightIndex = lightDef.light;
			if ( lightIndex === undefined ) return null;
			return this._loadLight( lightIndex ).then( function ( light ) {

				return parser._getNodeRef( self.cache, lightIndex, light );

			} );

		}

	}
	/**
	 * Unlit Materials Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_unlit
	 */


	class GLTFMaterialsUnlitExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_MATERIALS_UNLIT;

		}

		getMaterialType() {

			return THREE.MeshBasicMaterial;

		}

		extendParams( materialParams, materialDef, parser ) {

			const pending = [];
			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;
			const metallicRoughness = materialDef.pbrMetallicRoughness;

			if ( metallicRoughness ) {

				if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

					const array = metallicRoughness.baseColorFactor;
					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( metallicRoughness.baseColorTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

				}

			}

			return Promise.all( pending );

		}

	}
	/**
	 * Clearcoat Materials Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_clearcoat
	 */


	class GLTFMaterialsClearcoatExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_CLEARCOAT;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			const extension = materialDef.extensions[ this.name ];

			if ( extension.clearcoatFactor !== undefined ) {

				materialParams.clearcoat = extension.clearcoatFactor;

			}

			if ( extension.clearcoatTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'clearcoatMap', extension.clearcoatTexture ) );

			}

			if ( extension.clearcoatRoughnessFactor !== undefined ) {

				materialParams.clearcoatRoughness = extension.clearcoatRoughnessFactor;

			}

			if ( extension.clearcoatRoughnessTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'clearcoatRoughnessMap', extension.clearcoatRoughnessTexture ) );

			}

			if ( extension.clearcoatNormalTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'clearcoatNormalMap', extension.clearcoatNormalTexture ) );

				if ( extension.clearcoatNormalTexture.scale !== undefined ) {

					const scale = extension.clearcoatNormalTexture.scale; // https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995

					materialParams.clearcoatNormalScale = new THREE.Vector2( scale, - scale );

				}

			}

			return Promise.all( pending );

		}

	}
	/**
	 * Transmission Materials Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_transmission
	 * Draft: https://github.com/KhronosGroup/glTF/pull/1698
	 */


	class GLTFMaterialsTransmissionExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_MATERIALS_TRANSMISSION;

		}

		getMaterialType( materialIndex ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];
			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) return null;
			return THREE.MeshPhysicalMaterial;

		}

		extendMaterialParams( materialIndex, materialParams ) {

			const parser = this.parser;
			const materialDef = parser.json.materials[ materialIndex ];

			if ( ! materialDef.extensions || ! materialDef.extensions[ this.name ] ) {

				return Promise.resolve();

			}

			const pending = [];
			const extension = materialDef.extensions[ this.name ];

			if ( extension.transmissionFactor !== undefined ) {

				materialParams.transmission = extension.transmissionFactor;

			}

			if ( extension.transmissionTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'transmissionMap', extension.transmissionTexture ) );

			}

			return Promise.all( pending );

		}

	}
	/**
	 * BasisU Texture Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_basisu
	 */


	class GLTFTextureBasisUExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.KHR_TEXTURE_BASISU;

		}

		loadTexture( textureIndex ) {

			const parser = this.parser;
			const json = parser.json;
			const textureDef = json.textures[ textureIndex ];

			if ( ! textureDef.extensions || ! textureDef.extensions[ this.name ] ) {

				return null;

			}

			const extension = textureDef.extensions[ this.name ];
			const source = json.images[ extension.source ];
			const loader = parser.options.ktx2Loader;

			if ( ! loader ) {

				if ( json.extensionsRequired && json.extensionsRequired.indexOf( this.name ) >= 0 ) {

					throw new Error( 'THREE.GLTFLoader: setKTX2Loader must be called before loading KTX2 textures' );

				} else {

					// Assumes that the extension is optional and that a fallback texture is present
					return null;

				}

			}

			return parser.loadTextureImage( textureIndex, source, loader );

		}

	}
	/**
	 * WebP Texture Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_texture_webp
	 */


	class GLTFTextureWebPExtension {

		constructor( parser ) {

			this.parser = parser;
			this.name = EXTENSIONS.EXT_TEXTURE_WEBP;
			this.isSupported = null;

		}

		loadTexture( textureIndex ) {

			const name = this.name;
			const parser = this.parser;
			const json = parser.json;
			const textureDef = json.textures[ textureIndex ];

			if ( ! textureDef.extensions || ! textureDef.extensions[ name ] ) {

				return null;

			}

			const extension = textureDef.extensions[ name ];
			const source = json.images[ extension.source ];
			let loader = parser.textureLoader;

			if ( source.uri ) {

				const handler = parser.options.manager.getHandler( source.uri );
				if ( handler !== null ) loader = handler;

			}

			return this.detectSupport().then( function ( isSupported ) {

				if ( isSupported ) return parser.loadTextureImage( textureIndex, source, loader );

				if ( json.extensionsRequired && json.extensionsRequired.indexOf( name ) >= 0 ) {

					throw new Error( 'THREE.GLTFLoader: WebP required by asset but unsupported.' );

				} // Fall back to PNG or JPEG.


				return parser.loadTexture( textureIndex );

			} );

		}

		detectSupport() {

			if ( ! this.isSupported ) {

				this.isSupported = new Promise( function ( resolve ) {

					const image = new Image(); // Lossy test image. Support for lossy images doesn't guarantee support for all
					// WebP images, unfortunately.

					image.src = 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA';

					image.onload = image.onerror = function () {

						resolve( image.height === 1 );

					};

				} );

			}

			return this.isSupported;

		}

	}
	/**
	* meshopt BufferView Compression Extension
	*
	* Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Vendor/EXT_meshopt_compression
	*/


	class GLTFMeshoptCompression {

		constructor( parser ) {

			this.name = EXTENSIONS.EXT_MESHOPT_COMPRESSION;
			this.parser = parser;

		}

		loadBufferView( index ) {

			const json = this.parser.json;
			const bufferView = json.bufferViews[ index ];

			if ( bufferView.extensions && bufferView.extensions[ this.name ] ) {

				const extensionDef = bufferView.extensions[ this.name ];
				const buffer = this.parser.getDependency( 'buffer', extensionDef.buffer );
				const decoder = this.parser.options.meshoptDecoder;

				if ( ! decoder || ! decoder.supported ) {

					if ( json.extensionsRequired && json.extensionsRequired.indexOf( this.name ) >= 0 ) {

						throw new Error( 'THREE.GLTFLoader: setMeshoptDecoder must be called before loading compressed files' );

					} else {

						// Assumes that the extension is optional and that fallback buffer data is present
						return null;

					}

				}

				return Promise.all( [ buffer, decoder.ready ] ).then( function ( res ) {

					const byteOffset = extensionDef.byteOffset || 0;
					const byteLength = extensionDef.byteLength || 0;
					const count = extensionDef.count;
					const stride = extensionDef.byteStride;
					const result = new ArrayBuffer( count * stride );
					const source = new Uint8Array( res[ 0 ], byteOffset, byteLength );
					decoder.decodeGltfBuffer( new Uint8Array( result ), count, stride, source, extensionDef.mode, extensionDef.filter );
					return result;

				} );

			} else {

				return null;

			}

		}

	}
	/* BINARY EXTENSION */


	const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
	const BINARY_EXTENSION_HEADER_LENGTH = 12;
	const BINARY_EXTENSION_CHUNK_TYPES = {
		JSON: 0x4E4F534A,
		BIN: 0x004E4942
	};

	class GLTFBinaryExtension {

		constructor( data ) {

			this.name = EXTENSIONS.KHR_BINARY_GLTF;
			this.content = null;
			this.body = null;
			const headerView = new DataView( data, 0, BINARY_EXTENSION_HEADER_LENGTH );
			this.header = {
				magic: THREE.LoaderUtils.decodeText( new Uint8Array( data.slice( 0, 4 ) ) ),
				version: headerView.getUint32( 4, true ),
				length: headerView.getUint32( 8, true )
			};

			if ( this.header.magic !== BINARY_EXTENSION_HEADER_MAGIC ) {

				throw new Error( 'THREE.GLTFLoader: Unsupported glTF-Binary header.' );

			} else if ( this.header.version < 2.0 ) {

				throw new Error( 'THREE.GLTFLoader: Legacy binary file detected.' );

			}

			const chunkContentsLength = this.header.length - BINARY_EXTENSION_HEADER_LENGTH;
			const chunkView = new DataView( data, BINARY_EXTENSION_HEADER_LENGTH );
			let chunkIndex = 0;

			while ( chunkIndex < chunkContentsLength ) {

				const chunkLength = chunkView.getUint32( chunkIndex, true );
				chunkIndex += 4;
				const chunkType = chunkView.getUint32( chunkIndex, true );
				chunkIndex += 4;

				if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON ) {

					const contentArray = new Uint8Array( data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength );
					this.content = THREE.LoaderUtils.decodeText( contentArray );

				} else if ( chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN ) {

					const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
					this.body = data.slice( byteOffset, byteOffset + chunkLength );

				} // Clients must ignore chunks with unknown types.


				chunkIndex += chunkLength;

			}

			if ( this.content === null ) {

				throw new Error( 'THREE.GLTFLoader: JSON content not found.' );

			}

		}

	}
	/**
	 * DRACO THREE.Mesh Compression Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_draco_mesh_compression
	 */


	class GLTFDracoMeshCompressionExtension {

		constructor( json, dracoLoader ) {

			if ( ! dracoLoader ) {

				throw new Error( 'THREE.GLTFLoader: No DRACOLoader instance provided.' );

			}

			this.name = EXTENSIONS.KHR_DRACO_MESH_COMPRESSION;
			this.json = json;
			this.dracoLoader = dracoLoader;
			this.dracoLoader.preload();

		}

		decodePrimitive( primitive, parser ) {

			const json = this.json;
			const dracoLoader = this.dracoLoader;
			const bufferViewIndex = primitive.extensions[ this.name ].bufferView;
			const gltfAttributeMap = primitive.extensions[ this.name ].attributes;
			const threeAttributeMap = {};
			const attributeNormalizedMap = {};
			const attributeTypeMap = {};

			for ( const attributeName in gltfAttributeMap ) {

				const threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();
				threeAttributeMap[ threeAttributeName ] = gltfAttributeMap[ attributeName ];

			}

			for ( const attributeName in primitive.attributes ) {

				const threeAttributeName = ATTRIBUTES[ attributeName ] || attributeName.toLowerCase();

				if ( gltfAttributeMap[ attributeName ] !== undefined ) {

					const accessorDef = json.accessors[ primitive.attributes[ attributeName ] ];
					const componentType = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ];
					attributeTypeMap[ threeAttributeName ] = componentType;
					attributeNormalizedMap[ threeAttributeName ] = accessorDef.normalized === true;

				}

			}

			return parser.getDependency( 'bufferView', bufferViewIndex ).then( function ( bufferView ) {

				return new Promise( function ( resolve ) {

					dracoLoader.decodeDracoFile( bufferView, function ( geometry ) {

						for ( const attributeName in geometry.attributes ) {

							const attribute = geometry.attributes[ attributeName ];
							const normalized = attributeNormalizedMap[ attributeName ];
							if ( normalized !== undefined ) attribute.normalized = normalized;

						}

						resolve( geometry );

					}, threeAttributeMap, attributeTypeMap );

				} );

			} );

		}

	}
	/**
	 * Texture Transform Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_texture_transform
	 */


	class GLTFTextureTransformExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_TEXTURE_TRANSFORM;

		}

		extendTexture( texture, transform ) {

			texture = texture.clone();

			if ( transform.offset !== undefined ) {

				texture.offset.fromArray( transform.offset );

			}

			if ( transform.rotation !== undefined ) {

				texture.rotation = transform.rotation;

			}

			if ( transform.scale !== undefined ) {

				texture.repeat.fromArray( transform.scale );

			}

			if ( transform.texCoord !== undefined ) {

				console.warn( 'THREE.GLTFLoader: Custom UV sets in "' + this.name + '" extension not yet supported.' );

			}

			texture.needsUpdate = true;
			return texture;

		}

	}
	/**
	 * Specular-Glossiness Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness
	 */

	/**
	 * A sub class of StandardMaterial with some of the functionality
	 * changed via the `onBeforeCompile` callback
	 * @pailhead
	 */


	class GLTFMeshStandardSGMaterial extends THREE.MeshStandardMaterial {

		constructor( params ) {

			super();
			this.isGLTFSpecularGlossinessMaterial = true; //various chunks that need replacing

			const specularMapParsFragmentChunk = [ '#ifdef USE_SPECULARMAP', '	uniform sampler2D specularMap;', '#endif' ].join( '\n' );
			const glossinessMapParsFragmentChunk = [ '#ifdef USE_GLOSSINESSMAP', '	uniform sampler2D glossinessMap;', '#endif' ].join( '\n' );
			const specularMapFragmentChunk = [ 'vec3 specularFactor = specular;', '#ifdef USE_SPECULARMAP', '	vec4 texelSpecular = texture2D( specularMap, vUv );', '	texelSpecular = sRGBToLinear( texelSpecular );', '	// reads channel RGB, compatible with a glTF Specular-Glossiness (RGBA) texture', '	specularFactor *= texelSpecular.rgb;', '#endif' ].join( '\n' );
			const glossinessMapFragmentChunk = [ 'float glossinessFactor = glossiness;', '#ifdef USE_GLOSSINESSMAP', '	vec4 texelGlossiness = texture2D( glossinessMap, vUv );', '	// reads channel A, compatible with a glTF Specular-Glossiness (RGBA) texture', '	glossinessFactor *= texelGlossiness.a;', '#endif' ].join( '\n' );
			const lightPhysicalFragmentChunk = [ 'PhysicalMaterial material;', 'material.diffuseColor = diffuseColor.rgb * ( 1. - max( specularFactor.r, max( specularFactor.g, specularFactor.b ) ) );', 'vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );', 'float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );', 'material.specularRoughness = max( 1.0 - glossinessFactor, 0.0525 ); // 0.0525 corresponds to the base mip of a 256 cubemap.', 'material.specularRoughness += geometryRoughness;', 'material.specularRoughness = min( material.specularRoughness, 1.0 );', 'material.specularColor = specularFactor;' ].join( '\n' );
			const uniforms = {
				specular: {
					value: new THREE.Color().setHex( 0xffffff )
				},
				glossiness: {
					value: 1
				},
				specularMap: {
					value: null
				},
				glossinessMap: {
					value: null
				}
			};
			this._extraUniforms = uniforms;

			this.onBeforeCompile = function ( shader ) {

				for ( const uniformName in uniforms ) {

					shader.uniforms[ uniformName ] = uniforms[ uniformName ];

				}

				shader.fragmentShader = shader.fragmentShader.replace( 'uniform float roughness;', 'uniform vec3 specular;' ).replace( 'uniform float metalness;', 'uniform float glossiness;' ).replace( '#include <roughnessmap_pars_fragment>', specularMapParsFragmentChunk ).replace( '#include <metalnessmap_pars_fragment>', glossinessMapParsFragmentChunk ).replace( '#include <roughnessmap_fragment>', specularMapFragmentChunk ).replace( '#include <metalnessmap_fragment>', glossinessMapFragmentChunk ).replace( '#include <lights_physical_fragment>', lightPhysicalFragmentChunk );

			};

			Object.defineProperties( this, {
				specular: {
					get: function () {

						return uniforms.specular.value;

					},
					set: function ( v ) {

						uniforms.specular.value = v;

					}
				},
				specularMap: {
					get: function () {

						return uniforms.specularMap.value;

					},
					set: function ( v ) {

						uniforms.specularMap.value = v;

						if ( v ) {

							this.defines.USE_SPECULARMAP = ''; // USE_UV is set by the renderer for specular maps

						} else {

							delete this.defines.USE_SPECULARMAP;

						}

					}
				},
				glossiness: {
					get: function () {

						return uniforms.glossiness.value;

					},
					set: function ( v ) {

						uniforms.glossiness.value = v;

					}
				},
				glossinessMap: {
					get: function () {

						return uniforms.glossinessMap.value;

					},
					set: function ( v ) {

						uniforms.glossinessMap.value = v;

						if ( v ) {

							this.defines.USE_GLOSSINESSMAP = '';
							this.defines.USE_UV = '';

						} else {

							delete this.defines.USE_GLOSSINESSMAP;
							delete this.defines.USE_UV;

						}

					}
				}
			} );
			delete this.metalness;
			delete this.roughness;
			delete this.metalnessMap;
			delete this.roughnessMap;
			this.setValues( params );

		}

		copy( source ) {

			super.copy( source );
			this.specularMap = source.specularMap;
			this.specular.copy( source.specular );
			this.glossinessMap = source.glossinessMap;
			this.glossiness = source.glossiness;
			delete this.metalness;
			delete this.roughness;
			delete this.metalnessMap;
			delete this.roughnessMap;
			return this;

		}

	}

	class GLTFMaterialsPbrSpecularGlossinessExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS;
			this.specularGlossinessParams = [ 'color', 'map', 'lightMap', 'lightMapIntensity', 'aoMap', 'aoMapIntensity', 'emissive', 'emissiveIntensity', 'emissiveMap', 'bumpMap', 'bumpScale', 'normalMap', 'normalMapType', 'displacementMap', 'displacementScale', 'displacementBias', 'specularMap', 'specular', 'glossinessMap', 'glossiness', 'alphaMap', 'envMap', 'envMapIntensity', 'refractionRatio' ];

		}

		getMaterialType() {

			return GLTFMeshStandardSGMaterial;

		}

		extendParams( materialParams, materialDef, parser ) {

			const pbrSpecularGlossiness = materialDef.extensions[ this.name ];
			materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
			materialParams.opacity = 1.0;
			const pending = [];

			if ( Array.isArray( pbrSpecularGlossiness.diffuseFactor ) ) {

				const array = pbrSpecularGlossiness.diffuseFactor;
				materialParams.color.fromArray( array );
				materialParams.opacity = array[ 3 ];

			}

			if ( pbrSpecularGlossiness.diffuseTexture !== undefined ) {

				pending.push( parser.assignTexture( materialParams, 'map', pbrSpecularGlossiness.diffuseTexture ) );

			}

			materialParams.emissive = new THREE.Color( 0.0, 0.0, 0.0 );
			materialParams.glossiness = pbrSpecularGlossiness.glossinessFactor !== undefined ? pbrSpecularGlossiness.glossinessFactor : 1.0;
			materialParams.specular = new THREE.Color( 1.0, 1.0, 1.0 );

			if ( Array.isArray( pbrSpecularGlossiness.specularFactor ) ) {

				materialParams.specular.fromArray( pbrSpecularGlossiness.specularFactor );

			}

			if ( pbrSpecularGlossiness.specularGlossinessTexture !== undefined ) {

				const specGlossMapDef = pbrSpecularGlossiness.specularGlossinessTexture;
				pending.push( parser.assignTexture( materialParams, 'glossinessMap', specGlossMapDef ) );
				pending.push( parser.assignTexture( materialParams, 'specularMap', specGlossMapDef ) );

			}

			return Promise.all( pending );

		}

		createMaterial( materialParams ) {

			const material = new GLTFMeshStandardSGMaterial( materialParams );
			material.fog = true;
			material.color = materialParams.color;
			material.map = materialParams.map === undefined ? null : materialParams.map;
			material.lightMap = null;
			material.lightMapIntensity = 1.0;
			material.aoMap = materialParams.aoMap === undefined ? null : materialParams.aoMap;
			material.aoMapIntensity = 1.0;
			material.emissive = materialParams.emissive;
			material.emissiveIntensity = 1.0;
			material.emissiveMap = materialParams.emissiveMap === undefined ? null : materialParams.emissiveMap;
			material.bumpMap = materialParams.bumpMap === undefined ? null : materialParams.bumpMap;
			material.bumpScale = 1;
			material.normalMap = materialParams.normalMap === undefined ? null : materialParams.normalMap;
			material.normalMapType = THREE.TangentSpaceNormalMap;
			if ( materialParams.normalScale ) material.normalScale = materialParams.normalScale;
			material.displacementMap = null;
			material.displacementScale = 1;
			material.displacementBias = 0;
			material.specularMap = materialParams.specularMap === undefined ? null : materialParams.specularMap;
			material.specular = materialParams.specular;
			material.glossinessMap = materialParams.glossinessMap === undefined ? null : materialParams.glossinessMap;
			material.glossiness = materialParams.glossiness;
			material.alphaMap = null;
			material.envMap = materialParams.envMap === undefined ? null : materialParams.envMap;
			material.envMapIntensity = 1.0;
			material.refractionRatio = 0.98;
			return material;

		}

	}
	/**
	 * THREE.Mesh Quantization Extension
	 *
	 * Specification: https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization
	 */


	class GLTFMeshQuantizationExtension {

		constructor() {

			this.name = EXTENSIONS.KHR_MESH_QUANTIZATION;

		}

	}
	/*********************************/

	/********** INTERPOLATION ********/

	/*********************************/
	// Spline Interpolation
	// Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#appendix-c-spline-interpolation


	class GLTFCubicSplineInterpolant extends THREE.Interpolant {

		constructor( parameterPositions, sampleValues, sampleSize, resultBuffer ) {

			super( parameterPositions, sampleValues, sampleSize, resultBuffer );

		}

		copySampleValue_( index ) {

			// Copies a sample value to the result buffer. See description of glTF
			// CUBICSPLINE values layout in interpolate_() function below.
			const result = this.resultBuffer,
				values = this.sampleValues,
				valueSize = this.valueSize,
				offset = index * valueSize * 3 + valueSize;

			for ( let i = 0; i !== valueSize; i ++ ) {

				result[ i ] = values[ offset + i ];

			}

			return result;

		}

	}

	GLTFCubicSplineInterpolant.prototype.beforeStart_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;
	GLTFCubicSplineInterpolant.prototype.afterEnd_ = GLTFCubicSplineInterpolant.prototype.copySampleValue_;

	GLTFCubicSplineInterpolant.prototype.interpolate_ = function ( i1, t0, t, t1 ) {

		const result = this.resultBuffer;
		const values = this.sampleValues;
		const stride = this.valueSize;
		const stride2 = stride * 2;
		const stride3 = stride * 3;
		const td = t1 - t0;
		const p = ( t - t0 ) / td;
		const pp = p * p;
		const ppp = pp * p;
		const offset1 = i1 * stride3;
		const offset0 = offset1 - stride3;
		const s2 = - 2 * ppp + 3 * pp;
		const s3 = ppp - pp;
		const s0 = 1 - s2;
		const s1 = s3 - pp + p; // Layout of keyframe output values for CUBICSPLINE animations:
		//   [ inTangent_1, splineVertex_1, outTangent_1, inTangent_2, splineVertex_2, ... ]

		for ( let i = 0; i !== stride; i ++ ) {

			const p0 = values[ offset0 + i + stride ]; // splineVertex_k

			const m0 = values[ offset0 + i + stride2 ] * td; // outTangent_k * (t_k+1 - t_k)

			const p1 = values[ offset1 + i + stride ]; // splineVertex_k+1

			const m1 = values[ offset1 + i ] * td; // inTangent_k+1 * (t_k+1 - t_k)

			result[ i ] = s0 * p0 + s1 * m0 + s2 * p1 + s3 * m1;

		}

		return result;

	};
	/*********************************/

	/********** INTERNALS ************/

	/*********************************/

	/* CONSTANTS */


	const WEBGL_CONSTANTS = {
		FLOAT: 5126,
		//FLOAT_MAT2: 35674,
		FLOAT_MAT3: 35675,
		FLOAT_MAT4: 35676,
		FLOAT_VEC2: 35664,
		FLOAT_VEC3: 35665,
		FLOAT_VEC4: 35666,
		LINEAR: 9729,
		REPEAT: 10497,
		SAMPLER_2D: 35678,
		POINTS: 0,
		LINES: 1,
		LINE_LOOP: 2,
		LINE_STRIP: 3,
		TRIANGLES: 4,
		TRIANGLE_STRIP: 5,
		TRIANGLE_FAN: 6,
		UNSIGNED_BYTE: 5121,
		UNSIGNED_SHORT: 5123
	};
	const WEBGL_COMPONENT_TYPES = {
		5120: Int8Array,
		5121: Uint8Array,
		5122: Int16Array,
		5123: Uint16Array,
		5125: Uint32Array,
		5126: Float32Array
	};
	const WEBGL_FILTERS = {
		9728: THREE.NearestFilter,
		9729: THREE.LinearFilter,
		9984: THREE.NearestMipmapNearestFilter,
		9985: THREE.LinearMipmapNearestFilter,
		9986: THREE.NearestMipmapLinearFilter,
		9987: THREE.LinearMipmapLinearFilter
	};
	const WEBGL_WRAPPINGS = {
		33071: THREE.ClampToEdgeWrapping,
		33648: THREE.MirroredRepeatWrapping,
		10497: THREE.RepeatWrapping
	};
	const WEBGL_TYPE_SIZES = {
		'SCALAR': 1,
		'VEC2': 2,
		'VEC3': 3,
		'VEC4': 4,
		'MAT2': 4,
		'MAT3': 9,
		'MAT4': 16
	};
	const ATTRIBUTES = {
		POSITION: 'position',
		NORMAL: 'normal',
		TANGENT: 'tangent',
		TEXCOORD_0: 'uv',
		TEXCOORD_1: 'uv2',
		COLOR_0: 'color',
		WEIGHTS_0: 'skinWeight',
		JOINTS_0: 'skinIndex'
	};
	const PATH_PROPERTIES = {
		scale: 'scale',
		translation: 'position',
		rotation: 'quaternion',
		weights: 'morphTargetInfluences'
	};
	const INTERPOLATION = {
		CUBICSPLINE: undefined,
		// We use a custom interpolant (GLTFCubicSplineInterpolation) for CUBICSPLINE tracks. Each
		// keyframe track will be initialized with a default interpolation type, then modified.
		LINEAR: THREE.InterpolateLinear,
		STEP: THREE.InterpolateDiscrete
	};
	const ALPHA_MODES = {
		OPAQUE: 'OPAQUE',
		MASK: 'MASK',
		BLEND: 'BLEND'
	};
	/* UTILITY FUNCTIONS */

	function resolveURL( url, path ) {

		// Invalid URL
		if ( typeof url !== 'string' || url === '' ) return ''; // Host Relative URL

		if ( /^https?:\/\//i.test( path ) && /^\//.test( url ) ) {

			path = path.replace( /(^https?:\/\/[^\/]+).*/i, '$1' );

		} // Absolute URL http://,https://,//


		if ( /^(https?:)?\/\//i.test( url ) ) return url; // Data URI

		if ( /^data:.*,.*$/i.test( url ) ) return url; // Blob URL

		if ( /^blob:.*$/i.test( url ) ) return url; // Relative URL

		return path + url;

	}
	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#default-material
	 */


	function createDefaultMaterial( cache ) {

		if ( cache[ 'DefaultMaterial' ] === undefined ) {

			cache[ 'DefaultMaterial' ] = new THREE.MeshStandardMaterial( {
				color: 0xFFFFFF,
				emissive: 0x000000,
				metalness: 1,
				roughness: 1,
				transparent: false,
				depthTest: true,
				side: THREE.FrontSide
			} );

		}

		return cache[ 'DefaultMaterial' ];

	}

	function addUnknownExtensionsToUserData( knownExtensions, object, objectDef ) {

		// Add unknown glTF extensions to an object's userData.
		for ( const name in objectDef.extensions ) {

			if ( knownExtensions[ name ] === undefined ) {

				object.userData.gltfExtensions = object.userData.gltfExtensions || {};
				object.userData.gltfExtensions[ name ] = objectDef.extensions[ name ];

			}

		}

	}
	/**
	 * @param {Object3D|Material|BufferGeometry} object
	 * @param {GLTF.definition} gltfDef
	 */


	function assignExtrasToUserData( object, gltfDef ) {

		if ( gltfDef.extras !== undefined ) {

			if ( typeof gltfDef.extras === 'object' ) {

				Object.assign( object.userData, gltfDef.extras );

			} else {

				console.warn( 'THREE.GLTFLoader: Ignoring primitive type .extras, ' + gltfDef.extras );

			}

		}

	}
	/**
	 * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#morph-targets
	 *
	 * @param {BufferGeometry} geometry
	 * @param {Array<GLTF.Target>} targets
	 * @param {GLTFParser} parser
	 * @return {Promise<BufferGeometry>}
	 */


	function addMorphTargets( geometry, targets, parser ) {

		let hasMorphPosition = false;
		let hasMorphNormal = false;

		for ( let i = 0, il = targets.length; i < il; i ++ ) {

			const target = targets[ i ];
			if ( target.POSITION !== undefined ) hasMorphPosition = true;
			if ( target.NORMAL !== undefined ) hasMorphNormal = true;
			if ( hasMorphPosition && hasMorphNormal ) break;

		}

		if ( ! hasMorphPosition && ! hasMorphNormal ) return Promise.resolve( geometry );
		const pendingPositionAccessors = [];
		const pendingNormalAccessors = [];

		for ( let i = 0, il = targets.length; i < il; i ++ ) {

			const target = targets[ i ];

			if ( hasMorphPosition ) {

				const pendingAccessor = target.POSITION !== undefined ? parser.getDependency( 'accessor', target.POSITION ) : geometry.attributes.position;
				pendingPositionAccessors.push( pendingAccessor );

			}

			if ( hasMorphNormal ) {

				const pendingAccessor = target.NORMAL !== undefined ? parser.getDependency( 'accessor', target.NORMAL ) : geometry.attributes.normal;
				pendingNormalAccessors.push( pendingAccessor );

			}

		}

		return Promise.all( [ Promise.all( pendingPositionAccessors ), Promise.all( pendingNormalAccessors ) ] ).then( function ( accessors ) {

			const morphPositions = accessors[ 0 ];
			const morphNormals = accessors[ 1 ];
			if ( hasMorphPosition ) geometry.morphAttributes.position = morphPositions;
			if ( hasMorphNormal ) geometry.morphAttributes.normal = morphNormals;
			geometry.morphTargetsRelative = true;
			return geometry;

		} );

	}
	/**
	 * @param {Mesh} mesh
	 * @param {GLTF.Mesh} meshDef
	 */


	function updateMorphTargets( mesh, meshDef ) {

		mesh.updateMorphTargets();

		if ( meshDef.weights !== undefined ) {

			for ( let i = 0, il = meshDef.weights.length; i < il; i ++ ) {

				mesh.morphTargetInfluences[ i ] = meshDef.weights[ i ];

			}

		} // .extras has user-defined data, so check that .extras.targetNames is an array.


		if ( meshDef.extras && Array.isArray( meshDef.extras.targetNames ) ) {

			const targetNames = meshDef.extras.targetNames;

			if ( mesh.morphTargetInfluences.length === targetNames.length ) {

				mesh.morphTargetDictionary = {};

				for ( let i = 0, il = targetNames.length; i < il; i ++ ) {

					mesh.morphTargetDictionary[ targetNames[ i ] ] = i;

				}

			} else {

				console.warn( 'THREE.GLTFLoader: Invalid extras.targetNames length. Ignoring names.' );

			}

		}

	}

	function createPrimitiveKey( primitiveDef ) {

		const dracoExtension = primitiveDef.extensions && primitiveDef.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ];
		let geometryKey;

		if ( dracoExtension ) {

			geometryKey = 'draco:' + dracoExtension.bufferView + ':' + dracoExtension.indices + ':' + createAttributesKey( dracoExtension.attributes );

		} else {

			geometryKey = primitiveDef.indices + ':' + createAttributesKey( primitiveDef.attributes ) + ':' + primitiveDef.mode;

		}

		return geometryKey;

	}

	function createAttributesKey( attributes ) {

		let attributesKey = '';
		const keys = Object.keys( attributes ).sort();

		for ( let i = 0, il = keys.length; i < il; i ++ ) {

			attributesKey += keys[ i ] + ':' + attributes[ keys[ i ] ] + ';';

		}

		return attributesKey;

	}

	function getNormalizedComponentScale( constructor ) {

		// Reference:
		// https://github.com/KhronosGroup/glTF/tree/master/extensions/2.0/Khronos/KHR_mesh_quantization#encoding-quantized-data
		switch ( constructor ) {

			case Int8Array:
				return 1 / 127;

			case Uint8Array:
				return 1 / 255;

			case Int16Array:
				return 1 / 32767;

			case Uint16Array:
				return 1 / 65535;

			default:
				throw new Error( 'THREE.GLTFLoader: Unsupported normalized accessor component type.' );

		}

	}
	/* GLTF PARSER */


	class GLTFParser {

		constructor( json = {}, options = {} ) {

			this.json = json;
			this.extensions = {};
			this.plugins = {};
			this.options = options; // loader object cache

			this.cache = new GLTFRegistry(); // associations between Three.js objects and glTF elements

			this.associations = new Map(); // THREE.BufferGeometry caching

			this.primitiveCache = {}; // THREE.Object3D instance caches

			this.meshCache = {
				refs: {},
				uses: {}
			};
			this.cameraCache = {
				refs: {},
				uses: {}
			};
			this.lightCache = {
				refs: {},
				uses: {}
			}; // Track node names, to ensure no duplicates

			this.nodeNamesUsed = {}; // Use an THREE.ImageBitmapLoader if imageBitmaps are supported. Moves much of the
			// expensive work of uploading a texture to the GPU off the main thread.

			if ( typeof createImageBitmap !== 'undefined' && /Firefox/.test( navigator.userAgent ) === false ) {

				this.textureLoader = new THREE.ImageBitmapLoader( this.options.manager );

			} else {

				this.textureLoader = new THREE.TextureLoader( this.options.manager );

			}

			this.textureLoader.setCrossOrigin( this.options.crossOrigin );
			this.textureLoader.setRequestHeader( this.options.requestHeader );
			this.fileLoader = new THREE.FileLoader( this.options.manager );
			this.fileLoader.setResponseType( 'arraybuffer' );

			if ( this.options.crossOrigin === 'use-credentials' ) {

				this.fileLoader.setWithCredentials( true );

			}

		}

		setExtensions( extensions ) {

			this.extensions = extensions;

		}

		setPlugins( plugins ) {

			this.plugins = plugins;

		}

		parse( onLoad, onError ) {

			const parser = this;
			const json = this.json;
			const extensions = this.extensions; // Clear the loader cache

			this.cache.removeAll(); // Mark the special nodes/meshes in json for efficient parse

			this._invokeAll( function ( ext ) {

				return ext._markDefs && ext._markDefs();

			} );

			Promise.all( this._invokeAll( function ( ext ) {

				return ext.beforeRoot && ext.beforeRoot();

			} ) ).then( function () {

				return Promise.all( [ parser.getDependencies( 'scene' ), parser.getDependencies( 'animation' ), parser.getDependencies( 'camera' ) ] );

			} ).then( function ( dependencies ) {

				const result = {
					scene: dependencies[ 0 ][ json.scene || 0 ],
					scenes: dependencies[ 0 ],
					animations: dependencies[ 1 ],
					cameras: dependencies[ 2 ],
					asset: json.asset,
					parser: parser,
					userData: {}
				};
				addUnknownExtensionsToUserData( extensions, result, json );
				assignExtrasToUserData( result, json );
				Promise.all( parser._invokeAll( function ( ext ) {

					return ext.afterRoot && ext.afterRoot( result );

				} ) ).then( function () {

					onLoad( result );

				} );

			} ).catch( onError );

		}
		/**
   * Marks the special nodes/meshes in json for efficient parse.
   */


		_markDefs() {

			const nodeDefs = this.json.nodes || [];
			const skinDefs = this.json.skins || [];
			const meshDefs = this.json.meshes || []; // Nothing in the node definition indicates whether it is a THREE.Bone or an
			// THREE.Object3D. Use the skins' joint references to mark bones.

			for ( let skinIndex = 0, skinLength = skinDefs.length; skinIndex < skinLength; skinIndex ++ ) {

				const joints = skinDefs[ skinIndex ].joints;

				for ( let i = 0, il = joints.length; i < il; i ++ ) {

					nodeDefs[ joints[ i ] ].isBone = true;

				}

			} // Iterate over all nodes, marking references to shared resources,
			// as well as skeleton joints.


			for ( let nodeIndex = 0, nodeLength = nodeDefs.length; nodeIndex < nodeLength; nodeIndex ++ ) {

				const nodeDef = nodeDefs[ nodeIndex ];

				if ( nodeDef.mesh !== undefined ) {

					this._addNodeRef( this.meshCache, nodeDef.mesh ); // Nothing in the mesh definition indicates whether it is
					// a THREE.SkinnedMesh or THREE.Mesh. Use the node's mesh reference
					// to mark THREE.SkinnedMesh if node has skin.


					if ( nodeDef.skin !== undefined ) {

						meshDefs[ nodeDef.mesh ].isSkinnedMesh = true;

					}

				}

				if ( nodeDef.camera !== undefined ) {

					this._addNodeRef( this.cameraCache, nodeDef.camera );

				}

			}

		}
		/**
   * Counts references to shared node / THREE.Object3D resources. These resources
   * can be reused, or "instantiated", at multiple nodes in the scene
   * hierarchy. THREE.Mesh, Camera, and Light instances are instantiated and must
   * be marked. Non-scenegraph resources (like Materials, Geometries, and
   * Textures) can be reused directly and are not marked here.
   *
   * Example: CesiumMilkTruck sample model reuses "Wheel" meshes.
   */


		_addNodeRef( cache, index ) {

			if ( index === undefined ) return;

			if ( cache.refs[ index ] === undefined ) {

				cache.refs[ index ] = cache.uses[ index ] = 0;

			}

			cache.refs[ index ] ++;

		}
		/** Returns a reference to a shared resource, cloning it if necessary. */


		_getNodeRef( cache, index, object ) {

			if ( cache.refs[ index ] <= 1 ) return object;
			const ref = object.clone();
			ref.name += '_instance_' + cache.uses[ index ] ++;
			return ref;

		}

		_invokeOne( func ) {

			const extensions = Object.values( this.plugins );
			extensions.push( this );

			for ( let i = 0; i < extensions.length; i ++ ) {

				const result = func( extensions[ i ] );
				if ( result ) return result;

			}

			return null;

		}

		_invokeAll( func ) {

			const extensions = Object.values( this.plugins );
			extensions.unshift( this );
			const pending = [];

			for ( let i = 0; i < extensions.length; i ++ ) {

				const result = func( extensions[ i ] );
				if ( result ) pending.push( result );

			}

			return pending;

		}
		/**
   * Requests the specified dependency asynchronously, with caching.
   * @param {string} type
   * @param {number} index
   * @return {Promise<Object3D|Material|THREE.Texture|AnimationClip|ArrayBuffer|Object>}
   */


		getDependency( type, index ) {

			const cacheKey = type + ':' + index;
			let dependency = this.cache.get( cacheKey );

			if ( ! dependency ) {

				switch ( type ) {

					case 'scene':
						dependency = this.loadScene( index );
						break;

					case 'node':
						dependency = this.loadNode( index );
						break;

					case 'mesh':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadMesh && ext.loadMesh( index );

						} );
						break;

					case 'accessor':
						dependency = this.loadAccessor( index );
						break;

					case 'bufferView':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadBufferView && ext.loadBufferView( index );

						} );
						break;

					case 'buffer':
						dependency = this.loadBuffer( index );
						break;

					case 'material':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadMaterial && ext.loadMaterial( index );

						} );
						break;

					case 'texture':
						dependency = this._invokeOne( function ( ext ) {

							return ext.loadTexture && ext.loadTexture( index );

						} );
						break;

					case 'skin':
						dependency = this.loadSkin( index );
						break;

					case 'animation':
						dependency = this.loadAnimation( index );
						break;

					case 'camera':
						dependency = this.loadCamera( index );
						break;

					default:
						throw new Error( 'Unknown type: ' + type );

				}

				this.cache.add( cacheKey, dependency );

			}

			return dependency;

		}
		/**
   * Requests all dependencies of the specified type asynchronously, with caching.
   * @param {string} type
   * @return {Promise<Array<Object>>}
   */


		getDependencies( type ) {

			let dependencies = this.cache.get( type );

			if ( ! dependencies ) {

				const parser = this;
				const defs = this.json[ type + ( type === 'mesh' ? 'es' : 's' ) ] || [];
				dependencies = Promise.all( defs.map( function ( def, index ) {

					return parser.getDependency( type, index );

				} ) );
				this.cache.add( type, dependencies );

			}

			return dependencies;

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   * @param {number} bufferIndex
   * @return {Promise<ArrayBuffer>}
   */


		loadBuffer( bufferIndex ) {

			const bufferDef = this.json.buffers[ bufferIndex ];
			const loader = this.fileLoader;

			if ( bufferDef.type && bufferDef.type !== 'arraybuffer' ) {

				throw new Error( 'THREE.GLTFLoader: ' + bufferDef.type + ' buffer type is not supported.' );

			} // If present, GLB container is required to be the first buffer.


			if ( bufferDef.uri === undefined && bufferIndex === 0 ) {

				return Promise.resolve( this.extensions[ EXTENSIONS.KHR_BINARY_GLTF ].body );

			}

			const options = this.options;
			return new Promise( function ( resolve, reject ) {

				loader.load( resolveURL( bufferDef.uri, options.path ), resolve, undefined, function () {

					reject( new Error( 'THREE.GLTFLoader: Failed to load buffer "' + bufferDef.uri + '".' ) );

				} );

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#buffers-and-buffer-views
   * @param {number} bufferViewIndex
   * @return {Promise<ArrayBuffer>}
   */


		loadBufferView( bufferViewIndex ) {

			const bufferViewDef = this.json.bufferViews[ bufferViewIndex ];
			return this.getDependency( 'buffer', bufferViewDef.buffer ).then( function ( buffer ) {

				const byteLength = bufferViewDef.byteLength || 0;
				const byteOffset = bufferViewDef.byteOffset || 0;
				return buffer.slice( byteOffset, byteOffset + byteLength );

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#accessors
   * @param {number} accessorIndex
   * @return {Promise<BufferAttribute|InterleavedBufferAttribute>}
   */


		loadAccessor( accessorIndex ) {

			const parser = this;
			const json = this.json;
			const accessorDef = this.json.accessors[ accessorIndex ];

			if ( accessorDef.bufferView === undefined && accessorDef.sparse === undefined ) {

				// Ignore empty accessors, which may be used to declare runtime
				// information about attributes coming from another source (e.g. Draco
				// compression extension).
				return Promise.resolve( null );

			}

			const pendingBufferViews = [];

			if ( accessorDef.bufferView !== undefined ) {

				pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.bufferView ) );

			} else {

				pendingBufferViews.push( null );

			}

			if ( accessorDef.sparse !== undefined ) {

				pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.indices.bufferView ) );
				pendingBufferViews.push( this.getDependency( 'bufferView', accessorDef.sparse.values.bufferView ) );

			}

			return Promise.all( pendingBufferViews ).then( function ( bufferViews ) {

				const bufferView = bufferViews[ 0 ];
				const itemSize = WEBGL_TYPE_SIZES[ accessorDef.type ];
				const TypedArray = WEBGL_COMPONENT_TYPES[ accessorDef.componentType ]; // For VEC3: itemSize is 3, elementBytes is 4, itemBytes is 12.

				const elementBytes = TypedArray.BYTES_PER_ELEMENT;
				const itemBytes = elementBytes * itemSize;
				const byteOffset = accessorDef.byteOffset || 0;
				const byteStride = accessorDef.bufferView !== undefined ? json.bufferViews[ accessorDef.bufferView ].byteStride : undefined;
				const normalized = accessorDef.normalized === true;
				let array, bufferAttribute; // The buffer is not interleaved if the stride is the item size in bytes.

				if ( byteStride && byteStride !== itemBytes ) {

					// Each "slice" of the buffer, as defined by 'count' elements of 'byteStride' bytes, gets its own THREE.InterleavedBuffer
					// This makes sure that IBA.count reflects accessor.count properly
					const ibSlice = Math.floor( byteOffset / byteStride );
					const ibCacheKey = 'InterleavedBuffer:' + accessorDef.bufferView + ':' + accessorDef.componentType + ':' + ibSlice + ':' + accessorDef.count;
					let ib = parser.cache.get( ibCacheKey );

					if ( ! ib ) {

						array = new TypedArray( bufferView, ibSlice * byteStride, accessorDef.count * byteStride / elementBytes ); // Integer parameters to IB/IBA are in array elements, not bytes.

						ib = new THREE.InterleavedBuffer( array, byteStride / elementBytes );
						parser.cache.add( ibCacheKey, ib );

					}

					bufferAttribute = new THREE.InterleavedBufferAttribute( ib, itemSize, byteOffset % byteStride / elementBytes, normalized );

				} else {

					if ( bufferView === null ) {

						array = new TypedArray( accessorDef.count * itemSize );

					} else {

						array = new TypedArray( bufferView, byteOffset, accessorDef.count * itemSize );

					}

					bufferAttribute = new THREE.BufferAttribute( array, itemSize, normalized );

				} // https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#sparse-accessors


				if ( accessorDef.sparse !== undefined ) {

					const itemSizeIndices = WEBGL_TYPE_SIZES.SCALAR;
					const TypedArrayIndices = WEBGL_COMPONENT_TYPES[ accessorDef.sparse.indices.componentType ];
					const byteOffsetIndices = accessorDef.sparse.indices.byteOffset || 0;
					const byteOffsetValues = accessorDef.sparse.values.byteOffset || 0;
					const sparseIndices = new TypedArrayIndices( bufferViews[ 1 ], byteOffsetIndices, accessorDef.sparse.count * itemSizeIndices );
					const sparseValues = new TypedArray( bufferViews[ 2 ], byteOffsetValues, accessorDef.sparse.count * itemSize );

					if ( bufferView !== null ) {

						// Avoid modifying the original ArrayBuffer, if the bufferView wasn't initialized with zeroes.
						bufferAttribute = new THREE.BufferAttribute( bufferAttribute.array.slice(), bufferAttribute.itemSize, bufferAttribute.normalized );

					}

					for ( let i = 0, il = sparseIndices.length; i < il; i ++ ) {

						const index = sparseIndices[ i ];
						bufferAttribute.setX( index, sparseValues[ i * itemSize ] );
						if ( itemSize >= 2 ) bufferAttribute.setY( index, sparseValues[ i * itemSize + 1 ] );
						if ( itemSize >= 3 ) bufferAttribute.setZ( index, sparseValues[ i * itemSize + 2 ] );
						if ( itemSize >= 4 ) bufferAttribute.setW( index, sparseValues[ i * itemSize + 3 ] );
						if ( itemSize >= 5 ) throw new Error( 'THREE.GLTFLoader: Unsupported itemSize in sparse THREE.BufferAttribute.' );

					}

				}

				return bufferAttribute;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#textures
   * @param {number} textureIndex
   * @return {Promise<THREE.Texture>}
   */


		loadTexture( textureIndex ) {

			const json = this.json;
			const options = this.options;
			const textureDef = json.textures[ textureIndex ];
			const source = json.images[ textureDef.source ];
			let loader = this.textureLoader;

			if ( source.uri ) {

				const handler = options.manager.getHandler( source.uri );
				if ( handler !== null ) loader = handler;

			}

			return this.loadTextureImage( textureIndex, source, loader );

		}

		loadTextureImage( textureIndex, source, loader ) {

			const parser = this;
			const json = this.json;
			const options = this.options;
			const textureDef = json.textures[ textureIndex ];
			const URL = self.URL || self.webkitURL;
			let sourceURI = source.uri;
			let isObjectURL = false;
			let hasAlpha = true;
			if ( source.mimeType === 'image/jpeg' ) hasAlpha = false;

			if ( source.bufferView !== undefined ) {

				// Load binary image data from bufferView, if provided.
				sourceURI = parser.getDependency( 'bufferView', source.bufferView ).then( function ( bufferView ) {

					if ( source.mimeType === 'image/png' ) {

						// Inspect the PNG 'IHDR' chunk to determine whether the image could have an
						// alpha channel. This check is conservative — the image could have an alpha
						// channel with all values == 1, and the indexed type (colorType == 3) only
						// sometimes contains alpha.
						//
						// https://en.wikipedia.org/wiki/Portable_Network_Graphics#File_header
						const colorType = new DataView( bufferView, 25, 1 ).getUint8( 0, false );
						hasAlpha = colorType === 6 || colorType === 4 || colorType === 3;

					}

					isObjectURL = true;
					const blob = new Blob( [ bufferView ], {
						type: source.mimeType
					} );
					sourceURI = URL.createObjectURL( blob );
					return sourceURI;

				} );

			} else if ( source.uri === undefined ) {

				throw new Error( 'THREE.GLTFLoader: Image ' + textureIndex + ' is missing URI and bufferView' );

			}

			return Promise.resolve( sourceURI ).then( function ( sourceURI ) {

				return new Promise( function ( resolve, reject ) {

					let onLoad = resolve;

					if ( loader.isImageBitmapLoader === true ) {

						onLoad = function ( imageBitmap ) {

							resolve( new THREE.CanvasTexture( imageBitmap ) );

						};

					}

					loader.load( resolveURL( sourceURI, options.path ), onLoad, undefined, reject );

				} );

			} ).then( function ( texture ) {

				// Clean up resources and configure Texture.
				if ( isObjectURL === true ) {

					URL.revokeObjectURL( sourceURI );

				}

				texture.flipY = false;
				if ( textureDef.name ) texture.name = textureDef.name; // When there is definitely no alpha channel in the texture, set THREE.RGBFormat to save space.

				if ( ! hasAlpha ) texture.format = THREE.RGBFormat;
				const samplers = json.samplers || {};
				const sampler = samplers[ textureDef.sampler ] || {};
				texture.magFilter = WEBGL_FILTERS[ sampler.magFilter ] || THREE.LinearFilter;
				texture.minFilter = WEBGL_FILTERS[ sampler.minFilter ] || THREE.LinearMipmapLinearFilter;
				texture.wrapS = WEBGL_WRAPPINGS[ sampler.wrapS ] || THREE.RepeatWrapping;
				texture.wrapT = WEBGL_WRAPPINGS[ sampler.wrapT ] || THREE.RepeatWrapping;
				parser.associations.set( texture, {
					type: 'textures',
					index: textureIndex
				} );
				return texture;

			} );

		}
		/**
   * Asynchronously assigns a texture to the given material parameters.
   * @param {Object} materialParams
   * @param {string} mapName
   * @param {Object} mapDef
   * @return {Promise}
   */


		assignTexture( materialParams, mapName, mapDef ) {

			const parser = this;
			return this.getDependency( 'texture', mapDef.index ).then( function ( texture ) {

				// Materials sample aoMap from UV set 1 and other maps from UV set 0 - this can't be configured
				// However, we will copy UV set 0 to UV set 1 on demand for aoMap
				if ( mapDef.texCoord !== undefined && mapDef.texCoord != 0 && ! ( mapName === 'aoMap' && mapDef.texCoord == 1 ) ) {

					console.warn( 'THREE.GLTFLoader: Custom UV set ' + mapDef.texCoord + ' for texture ' + mapName + ' not yet supported.' );

				}

				if ( parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] ) {

					const transform = mapDef.extensions !== undefined ? mapDef.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ] : undefined;

					if ( transform ) {

						const gltfReference = parser.associations.get( texture );
						texture = parser.extensions[ EXTENSIONS.KHR_TEXTURE_TRANSFORM ].extendTexture( texture, transform );
						parser.associations.set( texture, gltfReference );

					}

				}

				materialParams[ mapName ] = texture;

			} );

		}
		/**
   * Assigns final material to a THREE.Mesh, THREE.Line, or THREE.Points instance. The instance
   * already has a material (generated from the glTF material options alone)
   * but reuse of the same glTF material may require multiple threejs materials
   * to accommodate different primitive types, defines, etc. New materials will
   * be created if necessary, and reused from a cache.
   * @param  {Object3D} mesh THREE.Mesh, THREE.Line, or THREE.Points instance.
   */


		assignFinalMaterial( mesh ) {

			const geometry = mesh.geometry;
			let material = mesh.material;
			const useVertexTangents = geometry.attributes.tangent !== undefined;
			const useVertexColors = geometry.attributes.color !== undefined;
			const useFlatShading = geometry.attributes.normal === undefined;
			const useSkinning = mesh.isSkinnedMesh === true;
			const useMorphTargets = Object.keys( geometry.morphAttributes ).length > 0;
			const useMorphNormals = useMorphTargets && geometry.morphAttributes.normal !== undefined;

			if ( mesh.isPoints ) {

				const cacheKey = 'PointsMaterial:' + material.uuid;
				let pointsMaterial = this.cache.get( cacheKey );

				if ( ! pointsMaterial ) {

					pointsMaterial = new THREE.PointsMaterial();
					THREE.Material.prototype.copy.call( pointsMaterial, material );
					pointsMaterial.color.copy( material.color );
					pointsMaterial.map = material.map;
					pointsMaterial.sizeAttenuation = false; // glTF spec says points should be 1px

					this.cache.add( cacheKey, pointsMaterial );

				}

				material = pointsMaterial;

			} else if ( mesh.isLine ) {

				const cacheKey = 'LineBasicMaterial:' + material.uuid;
				let lineMaterial = this.cache.get( cacheKey );

				if ( ! lineMaterial ) {

					lineMaterial = new THREE.LineBasicMaterial();
					THREE.Material.prototype.copy.call( lineMaterial, material );
					lineMaterial.color.copy( material.color );
					this.cache.add( cacheKey, lineMaterial );

				}

				material = lineMaterial;

			} // Clone the material if it will be modified


			if ( useVertexTangents || useVertexColors || useFlatShading || useSkinning || useMorphTargets ) {

				let cacheKey = 'ClonedMaterial:' + material.uuid + ':';
				if ( material.isGLTFSpecularGlossinessMaterial ) cacheKey += 'specular-glossiness:';
				if ( useSkinning ) cacheKey += 'skinning:';
				if ( useVertexTangents ) cacheKey += 'vertex-tangents:';
				if ( useVertexColors ) cacheKey += 'vertex-colors:';
				if ( useFlatShading ) cacheKey += 'flat-shading:';
				if ( useMorphTargets ) cacheKey += 'morph-targets:';
				if ( useMorphNormals ) cacheKey += 'morph-normals:';
				let cachedMaterial = this.cache.get( cacheKey );

				if ( ! cachedMaterial ) {

					cachedMaterial = material.clone();
					if ( useSkinning ) cachedMaterial.skinning = true;
					if ( useVertexColors ) cachedMaterial.vertexColors = true;
					if ( useFlatShading ) cachedMaterial.flatShading = true;
					if ( useMorphTargets ) cachedMaterial.morphTargets = true;
					if ( useMorphNormals ) cachedMaterial.morphNormals = true;

					if ( useVertexTangents ) {

						cachedMaterial.vertexTangents = true; // https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995

						if ( cachedMaterial.normalScale ) cachedMaterial.normalScale.y *= - 1;
						if ( cachedMaterial.clearcoatNormalScale ) cachedMaterial.clearcoatNormalScale.y *= - 1;

					}

					this.cache.add( cacheKey, cachedMaterial );
					this.associations.set( cachedMaterial, this.associations.get( material ) );

				}

				material = cachedMaterial;

			} // workarounds for mesh and geometry


			if ( material.aoMap && geometry.attributes.uv2 === undefined && geometry.attributes.uv !== undefined ) {

				geometry.setAttribute( 'uv2', geometry.attributes.uv );

			}

			mesh.material = material;

		}

		getMaterialType( ) {

			return THREE.MeshStandardMaterial;

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#materials
   * @param {number} materialIndex
   * @return {Promise<Material>}
   */


		loadMaterial( materialIndex ) {

			const parser = this;
			const json = this.json;
			const extensions = this.extensions;
			const materialDef = json.materials[ materialIndex ];
			let materialType;
			const materialParams = {};
			const materialExtensions = materialDef.extensions || {};
			const pending = [];

			if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ] ) {

				const sgExtension = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ];
				materialType = sgExtension.getMaterialType();
				pending.push( sgExtension.extendParams( materialParams, materialDef, parser ) );

			} else if ( materialExtensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ] ) {

				const kmuExtension = extensions[ EXTENSIONS.KHR_MATERIALS_UNLIT ];
				materialType = kmuExtension.getMaterialType();
				pending.push( kmuExtension.extendParams( materialParams, materialDef, parser ) );

			} else {

				// Specification:
				// https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#metallic-roughness-material
				const metallicRoughness = materialDef.pbrMetallicRoughness || {};
				materialParams.color = new THREE.Color( 1.0, 1.0, 1.0 );
				materialParams.opacity = 1.0;

				if ( Array.isArray( metallicRoughness.baseColorFactor ) ) {

					const array = metallicRoughness.baseColorFactor;
					materialParams.color.fromArray( array );
					materialParams.opacity = array[ 3 ];

				}

				if ( metallicRoughness.baseColorTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'map', metallicRoughness.baseColorTexture ) );

				}

				materialParams.metalness = metallicRoughness.metallicFactor !== undefined ? metallicRoughness.metallicFactor : 1.0;
				materialParams.roughness = metallicRoughness.roughnessFactor !== undefined ? metallicRoughness.roughnessFactor : 1.0;

				if ( metallicRoughness.metallicRoughnessTexture !== undefined ) {

					pending.push( parser.assignTexture( materialParams, 'metalnessMap', metallicRoughness.metallicRoughnessTexture ) );
					pending.push( parser.assignTexture( materialParams, 'roughnessMap', metallicRoughness.metallicRoughnessTexture ) );

				}

				materialType = this._invokeOne( function ( ext ) {

					return ext.getMaterialType && ext.getMaterialType( materialIndex );

				} );
				pending.push( Promise.all( this._invokeAll( function ( ext ) {

					return ext.extendMaterialParams && ext.extendMaterialParams( materialIndex, materialParams );

				} ) ) );

			}

			if ( materialDef.doubleSided === true ) {

				materialParams.side = THREE.DoubleSide;

			}

			const alphaMode = materialDef.alphaMode || ALPHA_MODES.OPAQUE;

			if ( alphaMode === ALPHA_MODES.BLEND ) {

				materialParams.transparent = true; // See: https://github.com/mrdoob/three.js/issues/17706

				materialParams.depthWrite = false;

			} else {

				materialParams.transparent = false;

				if ( alphaMode === ALPHA_MODES.MASK ) {

					materialParams.alphaTest = materialDef.alphaCutoff !== undefined ? materialDef.alphaCutoff : 0.5;

				}

			}

			if ( materialDef.normalTexture !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				pending.push( parser.assignTexture( materialParams, 'normalMap', materialDef.normalTexture ) ); // https://github.com/mrdoob/three.js/issues/11438#issuecomment-507003995

				materialParams.normalScale = new THREE.Vector2( 1, - 1 );

				if ( materialDef.normalTexture.scale !== undefined ) {

					materialParams.normalScale.set( materialDef.normalTexture.scale, - materialDef.normalTexture.scale );

				}

			}

			if ( materialDef.occlusionTexture !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				pending.push( parser.assignTexture( materialParams, 'aoMap', materialDef.occlusionTexture ) );

				if ( materialDef.occlusionTexture.strength !== undefined ) {

					materialParams.aoMapIntensity = materialDef.occlusionTexture.strength;

				}

			}

			if ( materialDef.emissiveFactor !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				materialParams.emissive = new THREE.Color().fromArray( materialDef.emissiveFactor );

			}

			if ( materialDef.emissiveTexture !== undefined && materialType !== THREE.MeshBasicMaterial ) {

				pending.push( parser.assignTexture( materialParams, 'emissiveMap', materialDef.emissiveTexture ) );

			}

			return Promise.all( pending ).then( function () {

				let material;

				if ( materialType === GLTFMeshStandardSGMaterial ) {

					material = extensions[ EXTENSIONS.KHR_MATERIALS_PBR_SPECULAR_GLOSSINESS ].createMaterial( materialParams );

				} else {

					material = new materialType( materialParams );

				}

				if ( materialDef.name ) material.name = materialDef.name; // baseColorTexture, emissiveTexture, and specularGlossinessTexture use sRGB encoding.

				if ( material.map ) material.map.encoding = THREE.sRGBEncoding;
				if ( material.emissiveMap ) material.emissiveMap.encoding = THREE.sRGBEncoding;
				assignExtrasToUserData( material, materialDef );
				parser.associations.set( material, {
					type: 'materials',
					index: materialIndex
				} );
				if ( materialDef.extensions ) addUnknownExtensionsToUserData( extensions, material, materialDef );
				return material;

			} );

		}
		/** When THREE.Object3D instances are targeted by animation, they need unique names. */


		createUniqueName( originalName ) {

			const sanitizedName = THREE.PropertyBinding.sanitizeNodeName( originalName || '' );
			let name = sanitizedName;

			for ( let i = 1; this.nodeNamesUsed[ name ]; ++ i ) {

				name = sanitizedName + '_' + i;

			}

			this.nodeNamesUsed[ name ] = true;
			return name;

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#geometry
   *
   * Creates BufferGeometries from primitives.
   *
   * @param {Array<GLTF.Primitive>} primitives
   * @return {Promise<Array<BufferGeometry>>}
   */


		loadGeometries( primitives ) {

			const parser = this;
			const extensions = this.extensions;
			const cache = this.primitiveCache;

			function createDracoPrimitive( primitive ) {

				return extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ].decodePrimitive( primitive, parser ).then( function ( geometry ) {

					return addPrimitiveAttributes( geometry, primitive, parser );

				} );

			}

			const pending = [];

			for ( let i = 0, il = primitives.length; i < il; i ++ ) {

				const primitive = primitives[ i ];
				const cacheKey = createPrimitiveKey( primitive ); // See if we've already created this geometry

				const cached = cache[ cacheKey ];

				if ( cached ) {

					// Use the cached geometry if it exists
					pending.push( cached.promise );

				} else {

					let geometryPromise;

					if ( primitive.extensions && primitive.extensions[ EXTENSIONS.KHR_DRACO_MESH_COMPRESSION ] ) {

						// Use DRACO geometry if available
						geometryPromise = createDracoPrimitive( primitive );

					} else {

						// Otherwise create a new geometry
						geometryPromise = addPrimitiveAttributes( new THREE.BufferGeometry(), primitive, parser );

					} // Cache this geometry


					cache[ cacheKey ] = {
						primitive: primitive,
						promise: geometryPromise
					};
					pending.push( geometryPromise );

				}

			}

			return Promise.all( pending );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/blob/master/specification/2.0/README.md#meshes
   * @param {number} meshIndex
   * @return {Promise<Group|Mesh|SkinnedMesh>}
   */


		loadMesh( meshIndex ) {

			const parser = this;
			const json = this.json;
			const extensions = this.extensions;
			const meshDef = json.meshes[ meshIndex ];
			const primitives = meshDef.primitives;
			const pending = [];

			for ( let i = 0, il = primitives.length; i < il; i ++ ) {

				const material = primitives[ i ].material === undefined ? createDefaultMaterial( this.cache ) : this.getDependency( 'material', primitives[ i ].material );
				pending.push( material );

			}

			pending.push( parser.loadGeometries( primitives ) );
			return Promise.all( pending ).then( function ( results ) {

				const materials = results.slice( 0, results.length - 1 );
				const geometries = results[ results.length - 1 ];
				const meshes = [];

				for ( let i = 0, il = geometries.length; i < il; i ++ ) {

					const geometry = geometries[ i ];
					const primitive = primitives[ i ]; // 1. create THREE.Mesh

					let mesh;
					const material = materials[ i ];

					if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLES || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP || primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN || primitive.mode === undefined ) {

						// .isSkinnedMesh isn't in glTF spec. See ._markDefs()
						mesh = meshDef.isSkinnedMesh === true ? new THREE.SkinnedMesh( geometry, material ) : new THREE.Mesh( geometry, material );

						if ( mesh.isSkinnedMesh === true && ! mesh.geometry.attributes.skinWeight.normalized ) {

							// we normalize floating point skin weight array to fix malformed assets (see #15319)
							// it's important to skip this for non-float32 data since normalizeSkinWeights assumes non-normalized inputs
							mesh.normalizeSkinWeights();

						}

						if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_STRIP ) {

							mesh.geometry = toTrianglesDrawMode( mesh.geometry, THREE.TriangleStripDrawMode );

						} else if ( primitive.mode === WEBGL_CONSTANTS.TRIANGLE_FAN ) {

							mesh.geometry = toTrianglesDrawMode( mesh.geometry, THREE.TriangleFanDrawMode );

						}

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINES ) {

						mesh = new THREE.LineSegments( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_STRIP ) {

						mesh = new THREE.Line( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.LINE_LOOP ) {

						mesh = new THREE.LineLoop( geometry, material );

					} else if ( primitive.mode === WEBGL_CONSTANTS.POINTS ) {

						mesh = new THREE.Points( geometry, material );

					} else {

						throw new Error( 'THREE.GLTFLoader: Primitive mode unsupported: ' + primitive.mode );

					}

					if ( Object.keys( mesh.geometry.morphAttributes ).length > 0 ) {

						updateMorphTargets( mesh, meshDef );

					}

					mesh.name = parser.createUniqueName( meshDef.name || 'mesh_' + meshIndex );
					assignExtrasToUserData( mesh, meshDef );
					if ( primitive.extensions ) addUnknownExtensionsToUserData( extensions, mesh, primitive );
					parser.assignFinalMaterial( mesh );
					meshes.push( mesh );

				}

				if ( meshes.length === 1 ) {

					return meshes[ 0 ];

				}

				const group = new THREE.Group();

				for ( let i = 0, il = meshes.length; i < il; i ++ ) {

					group.add( meshes[ i ] );

				}

				return group;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#cameras
   * @param {number} cameraIndex
   * @return {Promise<THREE.Camera>}
   */


		loadCamera( cameraIndex ) {

			let camera;
			const cameraDef = this.json.cameras[ cameraIndex ];
			const params = cameraDef[ cameraDef.type ];

			if ( ! params ) {

				console.warn( 'THREE.GLTFLoader: Missing camera parameters.' );
				return;

			}

			if ( cameraDef.type === 'perspective' ) {

				camera = new THREE.PerspectiveCamera( THREE.MathUtils.radToDeg( params.yfov ), params.aspectRatio || 1, params.znear || 1, params.zfar || 2e6 );

			} else if ( cameraDef.type === 'orthographic' ) {

				camera = new THREE.OrthographicCamera( - params.xmag, params.xmag, params.ymag, - params.ymag, params.znear, params.zfar );

			}

			if ( cameraDef.name ) camera.name = this.createUniqueName( cameraDef.name );
			assignExtrasToUserData( camera, cameraDef );
			return Promise.resolve( camera );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#skins
   * @param {number} skinIndex
   * @return {Promise<Object>}
   */


		loadSkin( skinIndex ) {

			const skinDef = this.json.skins[ skinIndex ];
			const skinEntry = {
				joints: skinDef.joints
			};

			if ( skinDef.inverseBindMatrices === undefined ) {

				return Promise.resolve( skinEntry );

			}

			return this.getDependency( 'accessor', skinDef.inverseBindMatrices ).then( function ( accessor ) {

				skinEntry.inverseBindMatrices = accessor;
				return skinEntry;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#animations
   * @param {number} animationIndex
   * @return {Promise<AnimationClip>}
   */


		loadAnimation( animationIndex ) {

			const json = this.json;
			const animationDef = json.animations[ animationIndex ];
			const pendingNodes = [];
			const pendingInputAccessors = [];
			const pendingOutputAccessors = [];
			const pendingSamplers = [];
			const pendingTargets = [];

			for ( let i = 0, il = animationDef.channels.length; i < il; i ++ ) {

				const channel = animationDef.channels[ i ];
				const sampler = animationDef.samplers[ channel.sampler ];
				const target = channel.target;
				const name = target.node !== undefined ? target.node : target.id; // NOTE: target.id is deprecated.

				const input = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.input ] : sampler.input;
				const output = animationDef.parameters !== undefined ? animationDef.parameters[ sampler.output ] : sampler.output;
				pendingNodes.push( this.getDependency( 'node', name ) );
				pendingInputAccessors.push( this.getDependency( 'accessor', input ) );
				pendingOutputAccessors.push( this.getDependency( 'accessor', output ) );
				pendingSamplers.push( sampler );
				pendingTargets.push( target );

			}

			return Promise.all( [ Promise.all( pendingNodes ), Promise.all( pendingInputAccessors ), Promise.all( pendingOutputAccessors ), Promise.all( pendingSamplers ), Promise.all( pendingTargets ) ] ).then( function ( dependencies ) {

				const nodes = dependencies[ 0 ];
				const inputAccessors = dependencies[ 1 ];
				const outputAccessors = dependencies[ 2 ];
				const samplers = dependencies[ 3 ];
				const targets = dependencies[ 4 ];
				const tracks = [];

				for ( let i = 0, il = nodes.length; i < il; i ++ ) {

					const node = nodes[ i ];
					const inputAccessor = inputAccessors[ i ];
					const outputAccessor = outputAccessors[ i ];
					const sampler = samplers[ i ];
					const target = targets[ i ];
					if ( node === undefined ) continue;
					node.updateMatrix();
					node.matrixAutoUpdate = true;
					let TypedKeyframeTrack;

					switch ( PATH_PROPERTIES[ target.path ] ) {

						case PATH_PROPERTIES.weights:
							TypedKeyframeTrack = THREE.NumberKeyframeTrack;
							break;

						case PATH_PROPERTIES.rotation:
							TypedKeyframeTrack = THREE.QuaternionKeyframeTrack;
							break;

						case PATH_PROPERTIES.position:
						case PATH_PROPERTIES.scale:
						default:
							TypedKeyframeTrack = THREE.VectorKeyframeTrack;
							break;

					}

					const targetName = node.name ? node.name : node.uuid;
					const interpolation = sampler.interpolation !== undefined ? INTERPOLATION[ sampler.interpolation ] : THREE.InterpolateLinear;
					const targetNames = [];

					if ( PATH_PROPERTIES[ target.path ] === PATH_PROPERTIES.weights ) {

						// Node may be a THREE.Group (glTF mesh with several primitives) or a THREE.Mesh.
						node.traverse( function ( object ) {

							if ( object.isMesh === true && object.morphTargetInfluences ) {

								targetNames.push( object.name ? object.name : object.uuid );

							}

						} );

					} else {

						targetNames.push( targetName );

					}

					let outputArray = outputAccessor.array;

					if ( outputAccessor.normalized ) {

						const scale = getNormalizedComponentScale( outputArray.constructor );
						const scaled = new Float32Array( outputArray.length );

						for ( let j = 0, jl = outputArray.length; j < jl; j ++ ) {

							scaled[ j ] = outputArray[ j ] * scale;

						}

						outputArray = scaled;

					}

					for ( let j = 0, jl = targetNames.length; j < jl; j ++ ) {

						const track = new TypedKeyframeTrack( targetNames[ j ] + '.' + PATH_PROPERTIES[ target.path ], inputAccessor.array, outputArray, interpolation ); // Override interpolation with custom factory method.

						if ( sampler.interpolation === 'CUBICSPLINE' ) {

							track.createInterpolant = function InterpolantFactoryMethodGLTFCubicSpline( result ) {

								// A CUBICSPLINE keyframe in glTF has three output values for each input value,
								// representing inTangent, splineVertex, and outTangent. As a result, track.getValueSize()
								// must be divided by three to get the interpolant's sampleSize argument.
								return new GLTFCubicSplineInterpolant( this.times, this.values, this.getValueSize() / 3, result );

							}; // Mark as CUBICSPLINE. `track.getInterpolation()` doesn't support custom interpolants.


							track.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline = true;

						}

						tracks.push( track );

					}

				}

				const name = animationDef.name ? animationDef.name : 'animation_' + animationIndex;
				return new THREE.AnimationClip( name, undefined, tracks );

			} );

		}

		createNodeMesh( nodeIndex ) {

			const json = this.json;
			const parser = this;
			const nodeDef = json.nodes[ nodeIndex ];
			if ( nodeDef.mesh === undefined ) return null;
			return parser.getDependency( 'mesh', nodeDef.mesh ).then( function ( mesh ) {

				const node = parser._getNodeRef( parser.meshCache, nodeDef.mesh, mesh ); // if weights are provided on the node, override weights on the mesh.


				if ( nodeDef.weights !== undefined ) {

					node.traverse( function ( o ) {

						if ( ! o.isMesh ) return;

						for ( let i = 0, il = nodeDef.weights.length; i < il; i ++ ) {

							o.morphTargetInfluences[ i ] = nodeDef.weights[ i ];

						}

					} );

				}

				return node;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#nodes-and-hierarchy
   * @param {number} nodeIndex
   * @return {Promise<Object3D>}
   */


		loadNode( nodeIndex ) {

			const json = this.json;
			const extensions = this.extensions;
			const parser = this;
			const nodeDef = json.nodes[ nodeIndex ]; // reserve node's name before its dependencies, so the root has the intended name.

			const nodeName = nodeDef.name ? parser.createUniqueName( nodeDef.name ) : '';
			return function () {

				const pending = [];

				const meshPromise = parser._invokeOne( function ( ext ) {

					return ext.createNodeMesh && ext.createNodeMesh( nodeIndex );

				} );

				if ( meshPromise ) {

					pending.push( meshPromise );

				}

				if ( nodeDef.camera !== undefined ) {

					pending.push( parser.getDependency( 'camera', nodeDef.camera ).then( function ( camera ) {

						return parser._getNodeRef( parser.cameraCache, nodeDef.camera, camera );

					} ) );

				}

				parser._invokeAll( function ( ext ) {

					return ext.createNodeAttachment && ext.createNodeAttachment( nodeIndex );

				} ).forEach( function ( promise ) {

					pending.push( promise );

				} );

				return Promise.all( pending );

			}().then( function ( objects ) {

				let node; // .isBone isn't in glTF spec. See ._markDefs

				if ( nodeDef.isBone === true ) {

					node = new THREE.Bone();

				} else if ( objects.length > 1 ) {

					node = new THREE.Group();

				} else if ( objects.length === 1 ) {

					node = objects[ 0 ];

				} else {

					node = new THREE.Object3D();

				}

				if ( node !== objects[ 0 ] ) {

					for ( let i = 0, il = objects.length; i < il; i ++ ) {

						node.add( objects[ i ] );

					}

				}

				if ( nodeDef.name ) {

					node.userData.name = nodeDef.name;
					node.name = nodeName;

				}

				assignExtrasToUserData( node, nodeDef );
				if ( nodeDef.extensions ) addUnknownExtensionsToUserData( extensions, node, nodeDef );

				if ( nodeDef.matrix !== undefined ) {

					const matrix = new THREE.Matrix4();
					matrix.fromArray( nodeDef.matrix );
					node.applyMatrix4( matrix );

				} else {

					if ( nodeDef.translation !== undefined ) {

						node.position.fromArray( nodeDef.translation );

					}

					if ( nodeDef.rotation !== undefined ) {

						node.quaternion.fromArray( nodeDef.rotation );

					}

					if ( nodeDef.scale !== undefined ) {

						node.scale.fromArray( nodeDef.scale );

					}

				}

				parser.associations.set( node, {
					type: 'nodes',
					index: nodeIndex
				} );
				return node;

			} );

		}
		/**
   * Specification: https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#scenes
   * @param {number} sceneIndex
   * @return {Promise<Group>}
   */


		loadScene( sceneIndex ) {

			const json = this.json;
			const extensions = this.extensions;
			const sceneDef = this.json.scenes[ sceneIndex ];
			const parser = this; // THREE.Loader returns THREE.Group, not Scene.
			// See: https://github.com/mrdoob/three.js/issues/18342#issuecomment-578981172

			const scene = new THREE.Group();
			if ( sceneDef.name ) scene.name = parser.createUniqueName( sceneDef.name );
			assignExtrasToUserData( scene, sceneDef );
			if ( sceneDef.extensions ) addUnknownExtensionsToUserData( extensions, scene, sceneDef );
			const nodeIds = sceneDef.nodes || [];
			const pending = [];

			for ( let i = 0, il = nodeIds.length; i < il; i ++ ) {

				pending.push( buildNodeHierachy( nodeIds[ i ], scene, json, parser ) );

			}

			return Promise.all( pending ).then( function () {

				return scene;

			} );

		}

	}

	function buildNodeHierachy( nodeId, parentObject, json, parser ) {

		const nodeDef = json.nodes[ nodeId ];
		return parser.getDependency( 'node', nodeId ).then( function ( node ) {

			if ( nodeDef.skin === undefined ) return node; // build skeleton here as well

			let skinEntry;
			return parser.getDependency( 'skin', nodeDef.skin ).then( function ( skin ) {

				skinEntry = skin;
				const pendingJoints = [];

				for ( let i = 0, il = skinEntry.joints.length; i < il; i ++ ) {

					pendingJoints.push( parser.getDependency( 'node', skinEntry.joints[ i ] ) );

				}

				return Promise.all( pendingJoints );

			} ).then( function ( jointNodes ) {

				node.traverse( function ( mesh ) {

					if ( ! mesh.isMesh ) return;
					const bones = [];
					const boneInverses = [];

					for ( let j = 0, jl = jointNodes.length; j < jl; j ++ ) {

						const jointNode = jointNodes[ j ];

						if ( jointNode ) {

							bones.push( jointNode );
							const mat = new THREE.Matrix4();

							if ( skinEntry.inverseBindMatrices !== undefined ) {

								mat.fromArray( skinEntry.inverseBindMatrices.array, j * 16 );

							}

							boneInverses.push( mat );

						} else {

							console.warn( 'THREE.GLTFLoader: Joint "%s" could not be found.', skinEntry.joints[ j ] );

						}

					}

					mesh.bind( new THREE.Skeleton( bones, boneInverses ), mesh.matrixWorld );

				} );
				return node;

			} );

		} ).then( function ( node ) {

			// build node hierachy
			parentObject.add( node );
			const pending = [];

			if ( nodeDef.children ) {

				const children = nodeDef.children;

				for ( let i = 0, il = children.length; i < il; i ++ ) {

					const child = children[ i ];
					pending.push( buildNodeHierachy( child, node, json, parser ) );

				}

			}

			return Promise.all( pending );

		} );

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {GLTF.Primitive} primitiveDef
 * @param {GLTFParser} parser
 */


	function computeBounds( geometry, primitiveDef, parser ) {

		const attributes = primitiveDef.attributes;
		const box = new THREE.Box3();

		if ( attributes.POSITION !== undefined ) {

			const accessor = parser.json.accessors[ attributes.POSITION ];
			const min = accessor.min;
			const max = accessor.max; // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

			if ( min !== undefined && max !== undefined ) {

				box.set( new THREE.Vector3( min[ 0 ], min[ 1 ], min[ 2 ] ), new THREE.Vector3( max[ 0 ], max[ 1 ], max[ 2 ] ) );

				if ( accessor.normalized ) {

					const boxScale = getNormalizedComponentScale( WEBGL_COMPONENT_TYPES[ accessor.componentType ] );
					box.min.multiplyScalar( boxScale );
					box.max.multiplyScalar( boxScale );

				}

			} else {

				console.warn( 'THREE.GLTFLoader: Missing min/max properties for accessor POSITION.' );
				return;

			}

		} else {

			return;

		}

		const targets = primitiveDef.targets;

		if ( targets !== undefined ) {

			const maxDisplacement = new THREE.Vector3();
			const vector = new THREE.Vector3();

			for ( let i = 0, il = targets.length; i < il; i ++ ) {

				const target = targets[ i ];

				if ( target.POSITION !== undefined ) {

					const accessor = parser.json.accessors[ target.POSITION ];
					const min = accessor.min;
					const max = accessor.max; // glTF requires 'min' and 'max', but VRM (which extends glTF) currently ignores that requirement.

					if ( min !== undefined && max !== undefined ) {

						// we need to get max of absolute components because target weight is [-1,1]
						vector.setX( Math.max( Math.abs( min[ 0 ] ), Math.abs( max[ 0 ] ) ) );
						vector.setY( Math.max( Math.abs( min[ 1 ] ), Math.abs( max[ 1 ] ) ) );
						vector.setZ( Math.max( Math.abs( min[ 2 ] ), Math.abs( max[ 2 ] ) ) );

						if ( accessor.normalized ) {

							const boxScale = getNormalizedComponentScale( WEBGL_COMPONENT_TYPES[ accessor.componentType ] );
							vector.multiplyScalar( boxScale );

						} // Note: this assumes that the sum of all weights is at most 1. This isn't quite correct - it's more conservative
						// to assume that each target can have a max weight of 1. However, for some use cases - notably, when morph targets
						// are used to implement key-frame animations and as such only two are active at a time - this results in very large
						// boxes. So for now we make a box that's sometimes a touch too small but is hopefully mostly of reasonable size.


						maxDisplacement.max( vector );

					} else {

						console.warn( 'THREE.GLTFLoader: Missing min/max properties for accessor POSITION.' );

					}

				}

			} // As per comment above this box isn't conservative, but has a reasonable size for a very large number of morph targets.


			box.expandByVector( maxDisplacement );

		}

		geometry.boundingBox = box;
		const sphere = new THREE.Sphere();
		box.getCenter( sphere.center );
		sphere.radius = box.min.distanceTo( box.max ) / 2;
		geometry.boundingSphere = sphere;

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {GLTF.Primitive} primitiveDef
 * @param {GLTFParser} parser
 * @return {Promise<BufferGeometry>}
 */


	function addPrimitiveAttributes( geometry, primitiveDef, parser ) {

		const attributes = primitiveDef.attributes;
		const pending = [];

		function assignAttributeAccessor( accessorIndex, attributeName ) {

			return parser.getDependency( 'accessor', accessorIndex ).then( function ( accessor ) {

				geometry.setAttribute( attributeName, accessor );

			} );

		}

		for ( const gltfAttributeName in attributes ) {

			const threeAttributeName = ATTRIBUTES[ gltfAttributeName ] || gltfAttributeName.toLowerCase(); // Skip attributes already provided by e.g. Draco extension.

			if ( threeAttributeName in geometry.attributes ) continue;
			pending.push( assignAttributeAccessor( attributes[ gltfAttributeName ], threeAttributeName ) );

		}

		if ( primitiveDef.indices !== undefined && ! geometry.index ) {

			const accessor = parser.getDependency( 'accessor', primitiveDef.indices ).then( function ( accessor ) {

				geometry.setIndex( accessor );

			} );
			pending.push( accessor );

		}

		assignExtrasToUserData( geometry, primitiveDef );
		computeBounds( geometry, primitiveDef, parser );
		return Promise.all( pending ).then( function () {

			return primitiveDef.targets !== undefined ? addMorphTargets( geometry, primitiveDef.targets, parser ) : geometry;

		} );

	}
	/**
 * @param {BufferGeometry} geometry
 * @param {Number} drawMode
 * @return {BufferGeometry}
 */


	function toTrianglesDrawMode( geometry, drawMode ) {

		let index = geometry.getIndex(); // generate index if not present

		if ( index === null ) {

			const indices = [];
			const position = geometry.getAttribute( 'position' );

			if ( position !== undefined ) {

				for ( let i = 0; i < position.count; i ++ ) {

					indices.push( i );

				}

				geometry.setIndex( indices );
				index = geometry.getIndex();

			} else {

				console.error( 'THREE.GLTFLoader.toTrianglesDrawMode(): Undefined position attribute. Processing not possible.' );
				return geometry;

			}

		} //


		const numberOfTriangles = index.count - 2;
		const newIndices = [];

		if ( drawMode === THREE.TriangleFanDrawMode ) {

			// gl.TRIANGLE_FAN
			for ( let i = 1; i <= numberOfTriangles; i ++ ) {

				newIndices.push( index.getX( 0 ) );
				newIndices.push( index.getX( i ) );
				newIndices.push( index.getX( i + 1 ) );

			}

		} else {

			// gl.TRIANGLE_STRIP
			for ( let i = 0; i < numberOfTriangles; i ++ ) {

				if ( i % 2 === 0 ) {

					newIndices.push( index.getX( i ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i + 2 ) );

				} else {

					newIndices.push( index.getX( i + 2 ) );
					newIndices.push( index.getX( i + 1 ) );
					newIndices.push( index.getX( i ) );

				}

			}

		}

		if ( newIndices.length / 3 !== numberOfTriangles ) {

			console.error( 'THREE.GLTFLoader.toTrianglesDrawMode(): Unable to generate correct amount of triangles.' );

		} // build final geometry


		const newGeometry = geometry.clone();
		newGeometry.setIndex( newIndices );
		return newGeometry;

	}

	THREE.GLTFLoader = GLTFLoader;

} )();
/* ═══════════════════════════════════════════════════════════════
   KASSEL MISSION 3D — V2 "VR-QUALITY" ENGINE
   Loads AFTER the original embed blocks and replaces the visual
   builders (terrain, aircraft, atmosphere, particles) while keeping
   every interface used by the mission/battle/camera blocks intact:
     KM._s _cam _ren _cont _canv _curve _pts _water
     KM._buildB24 _buildFw190 _buildBf109 _buildP51 _crewPositions
   Real elevation: AWS Terrain Tiles (terrarium). Imagery: Esri World
   Imagery. Both keyless, CORS-enabled. Procedural fallback included.
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';
if(!window.KM){window.KM={};}
var KM=window.KM;
if(KM._v2Loaded)return; KM._v2Loaded=true;

var V2={tiles:{},demReady:false,texReady:false};
KM._v2=V2;

/* ───────────────────────── GEO MAPPING ─────────────────────────
   Scene anchors (must match KM._pts route): Tibenham(1.159E,52.454N)
   → (-680, 60) and Kassel(9.49E,51.31N) → (520,-210).
   x linear in longitude; z linear in Mercator-Y (so slippy tiles map
   affinely onto the scene plane). */
var GEO=(function(){
  function mercY(lat){return Math.log(Math.tan(Math.PI/4+lat*Math.PI/360));}
  function invMercY(my){return (2*Math.atan(Math.exp(my))-Math.PI/2)*180/Math.PI;}
  var lonA=1.159, xA=-680, lonB=9.49, xB=520;
  var myA=mercY(52.454), zA=60, myB=mercY(51.31), zB=-210;
  var kx=(xB-xA)/(lonB-lonA);          /* units per degree lon */
  var kz=(zB-zA)/(myB-myA);            /* units per mercY */
  return {
    mercY:mercY,
    lonToX:function(lon){return xA+(lon-lonA)*kx;},
    xToLon:function(x){return lonA+(x-xA)/kx;},
    /* NORTH-UP fix: negate z so +latitude renders toward the TOP of the
       top-down camera (loop then reads clockwise, England stays west) */
    latToZ:function(lat){return -(zA+(mercY(lat)-myA)*kz);},
    zToLat:function(z){return invMercY(myA+((-z)-zA)/kz);},
    lonLatToXZ:function(lon,lat){return [this.lonToX(lon),this.latToZ(lat)];}
  };
})();
V2.GEO=GEO;

/* Terrain bounds in scene units (slightly larger than original 2000×1400) */
/* oversized so the horizon never shows a ledge inside the view */
var TER={W:4200,D:3000,SEGX:440,SEGZ:312};
/* meters → scene units. 23,000 ft (7010 m) ≈ y=115 in the route curve.
   1.55× vertical exaggeration so the Harz/Thuringian relief reads. */
var ELEV_SCALE=(115/7010)*1.55;

/* ──────────────────────── TILE FETCHING ──────────────────────── */
function tile2lon(x,z){return x/Math.pow(2,z)*360-180;}
function tile2lat(y,z){var n=Math.PI-2*Math.PI*y/Math.pow(2,z);return 180/Math.PI*Math.atan(0.5*(Math.exp(n)-Math.exp(-n)));}
function lon2tile(lon,z){return (lon+180)/360*Math.pow(2,z);}
function lat2tile(lat,z){return (1-Math.log(Math.tan(lat*Math.PI/180)+1/Math.cos(lat*Math.PI/180))/Math.PI)/2*Math.pow(2,z);}

function loadImg(url){
  return new Promise(function(res,rej){
    var im=new Image();im.crossOrigin='anonymous';
    im.onload=function(){res(im);};im.onerror=rej;im.src=url;
  });
}

/* Fetch a rectangle of slippy tiles into one canvas.
   Returns {canvas,ctx,x0,y0,cols,rows,zoom,pxPerTile} */
function fetchTileRect(zoom,urlFn,onTile,atlasLayer){
  var lonMin=GEO.xToLon(-TER.W/2),lonMax=GEO.xToLon(TER.W/2);
  var _laA=GEO.zToLat(TER.D/2),_laB=GEO.zToLat(-TER.D/2);
  var latMax=Math.max(_laA,_laB),latMin=Math.min(_laA,_laB);
  var x0=Math.floor(lon2tile(lonMin,zoom)),x1=Math.floor(lon2tile(lonMax,zoom));
  var y0=Math.floor(lat2tile(latMax,zoom)),y1=Math.floor(lat2tile(latMin,zoom));
  var cols=x1-x0+1,rows=y1-y0+1;
  var c=document.createElement('canvas');
  c.width=cols*256;c.height=rows*256;
  var ctx=c.getContext('2d');
  var rect={canvas:c,ctx:ctx,x0:x0,y0:y0,cols:cols,rows:rows,zoom:zoom};
  function loadTiles(){
    var jobs=[];
    for(var ty=y0;ty<=y1;ty++)for(var tx=x0;tx<=x1;tx++){
      (function(tx,ty){
        jobs.push(loadImg(urlFn(zoom,tx,ty)).then(function(im){
          ctx.drawImage(im,(tx-x0)*256,(ty-y0)*256);
          if(onTile)onTile();
        }));
      })(tx,ty);
    }
    return Promise.all(jobs).then(function(){return rect;});
  }
  if(!atlasLayer)return loadTiles();
  var ext='.png';
  return loadImg('textures/'+atlasLayer+'-'+zoom+'-'+x0+'-'+y0+ext).then(function(im){
    if(im.width!==c.width||im.height!==c.height)return loadTiles();
    ctx.drawImage(im,0,0);return rect;
  },loadTiles);
}

/* scene XZ → pixel coords inside a tile-rect canvas */
function sceneToRectPx(rect,x,z){
  var lon=GEO.xToLon(x),lat=GEO.zToLat(z);
  var px=(lon2tile(lon,rect.zoom)-rect.x0)*256;
  var py=(lat2tile(lat,rect.zoom)-rect.y0)*256;
  return [px,py];
}

/* ─────────────────────────── DEM ─────────────────────────── */
V2.loadDEM=function(){
  if(V2._demPromise)return V2._demPromise;
  V2._demPromise=fetchTileRect(7,function(z,x,y){
    return 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+z+'/'+x+'/'+y+'.png';
  },null,'elevation').then(function(rect){
    rect.data=rect.ctx.getImageData(0,0,rect.canvas.width,rect.canvas.height).data;
    V2.dem=rect;V2.demReady=true;
    return rect;
  });
  return V2._demPromise;
};

/* elevation in meters at scene x,z (bilinear) */
V2.elevAt=function(x,z){
  var d=V2.dem;if(!d)return 0;
  var p=sceneToRectPx(d,x,z);
  var px=Math.max(0,Math.min(d.canvas.width-2,p[0]));
  var py=Math.max(0,Math.min(d.canvas.height-2,p[1]));
  var x0=Math.floor(px),y0=Math.floor(py),fx=px-x0,fy=py-y0;
  function h(ix,iy){
    var i=(iy*d.canvas.width+ix)*4;
    return (d.data[i]*256+d.data[i+1]+d.data[i+2]/256)-32768;
  }
  var v=h(x0,y0)*(1-fx)*(1-fy)+h(x0+1,y0)*fx*(1-fy)+h(x0,y0+1)*(1-fx)*fy+h(x0+1,y0+1)*fx*fy;
  return v;
};

/* ───────────────────────── IMAGERY ───────────────────────── */
V2.loadImagery=function(){
  var settings=window.KMSimulatorConfig||{};
  if(!settings.esriApiKey)return Promise.resolve(null);
  if(V2._texPromise)return V2._texPromise;
  V2._texPromise=fetchTileRect(7,function(z,x,y){
    return 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/'+
      z+'/'+y+'/'+x+'?token='+encodeURIComponent(settings.esriApiKey);
  }).then(function(rect){
    // Preserve the source land-cover colors. The scene sun and atmosphere
    // already supply the lighting for the current mission time.
    var c=rect.canvas;
    var g=document.createElement('canvas');g.width=c.width;g.height=c.height;
    var gc=g.getContext('2d');
    gc.filter='saturate(0.88)';gc.drawImage(c,0,0);
    rect.graded=g;
    V2.imagery=rect;V2.texReady=true;
    return rect;
  });
  return V2._texPromise;
};

/* DEM-derived normal map for extra relief pop */
V2.buildNormalMap=function(){
  var d=V2.dem;if(!d)return null;
  var w=d.canvas.width,h=d.canvas.height;
  var c=document.createElement('canvas');c.width=w;c.height=h;
  var ctx=c.getContext('2d');
  var out=ctx.createImageData(w,h);
  var src=d.data,dst=out.data;
  function hgt(ix,iy){
    ix=Math.max(0,Math.min(w-1,ix));iy=Math.max(0,Math.min(h-1,iy));
    var i=(iy*w+ix)*4;return (src[i]*256+src[i+1]+src[i+2]/256)-32768;
  }
  var equatorialSpacing=40075016.686/(256*Math.pow(2,d.zoom));
  for(var y=0;y<h;y++){
    var latitude=tile2lat(d.y0+(y+.5)/256,d.zoom);
    var s=1/(2*equatorialSpacing*Math.cos(latitude*Math.PI/180));
    for(var x=0;x<w;x++){
      var dx=(hgt(x+1,y)-hgt(x-1,y))*s;
      var dy=(hgt(x,y+1)-hgt(x,y-1))*s;
      var len=Math.sqrt(dx*dx+dy*dy+1);
      var i=(y*w+x)*4;
      dst[i]  =Math.round(((-dx/len)*0.5+0.5)*255);
      dst[i+1]=Math.round((( dy/len)*0.5+0.5)*255);
      dst[i+2]=Math.round(((1/len)*0.5+0.5)*255);
      dst[i+3]=255;
    }
  }
  ctx.putImageData(out,0,0);
  return c;
};
/* ───────────────────── ATMOSPHERE / SKY ───────────────────── */

/* Dawn sun direction: low over the east-southeast (route heading) */
V2.SUN_DIR=new THREE.Vector3(0.62,0.17,-0.30).normalize();

/* The mission ran 06:00 takeoff to 12:42 return — pre-dawn liftoff
   through full daylight by the time the survivors are over Holland
   again. The sky/fog palette below shifts from this dawn set toward
   a bright midday set across the flight (driven by updateSun in
   08-battle.js), so the look actually advances with the mission clock
   instead of reading as permanent dusk. */
V2.SKY_DAWN={zenith:0x497594,mid:0x829cab,horizon:0xc4ced1,dawn:0xd8d9cc,fog:0x9fadb5};
V2.SKY_DAY ={zenith:0x2f6fb0,mid:0x6fa8e0,horizon:0xc7d8e8,dawn:0xeaeede,fog:0x9fb8cc};

V2.buildSky=function(scene){
  var sunDir=V2.SUN_DIR;
  /* Gradient + sun-glow dome */
  var skyGeo=new THREE.SphereGeometry(3900,32,20);
  var skyMat=new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    uniforms:{
      sunDir:{value:sunDir.clone()},
      zenith:{value:new THREE.Color(0x060b18)},
      mid:{value:new THREE.Color(0x16273f)},
      horizon:{value:new THREE.Color(0x3d4b63)},
      dawn:{value:new THREE.Color(0xd98a4a)}
    },
    vertexShader:[
      'varying vec3 vDir;',
      'void main(){vDir=normalize(position);',
      'gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
    ].join('\n'),
    fragmentShader:[
      'varying vec3 vDir;',
      'uniform vec3 sunDir,zenith,mid,horizon,dawn;',
      'void main(){',
      ' float h=clamp(vDir.y,0.0,1.0);',
      ' vec3 col=mix(horizon,mid,smoothstep(0.0,0.22,h));',
      ' col=mix(col,zenith,smoothstep(0.18,0.65,h));',
      ' float sd=max(dot(vDir,sunDir),0.0);',
      ' float band=exp(-pow(vDir.y*7.5,2.0));',
      ' col+=dawn*band*pow(sd*0.5+0.5,3.0)*0.85;',          /* horizon dawn band */
      ' col+=dawn*pow(sd,18.0)*0.55;',                       /* wide sun glow */
      ' col+=vec3(1.0,0.82,0.58)*pow(sd,140.0)*2.4;',        /* sun core */
      ' float below=smoothstep(0.0,-0.12,vDir.y);',
      ' col=mix(col,horizon*0.55,below);',
      ' gl_FragColor=vec4(col,1.0);}'
    ].join('\n')
  });
  var sky=new THREE.Mesh(skyGeo,skyMat);
  sky.renderOrder=-10;
  scene.add(sky);
  scene.userData.v2skyMat=skyMat;

  /* Stars — fading toward horizon, pre-dawn */
  var sCount=700,sPos=new Float32Array(sCount*3),sSize=[];
  for(var i=0;i<sCount;i++){
    var t=Math.random()*Math.PI*2,p=Math.acos(Math.random()*0.85);/* bias zenith */
    var r=3700;
    sPos[i*3]=r*Math.sin(p)*Math.cos(t);
    sPos[i*3+1]=r*Math.cos(p)*0.92+120;
    sPos[i*3+2]=r*Math.sin(p)*Math.sin(t);
  }
  var sGeo=new THREE.BufferGeometry();
  sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));
  var stars=new THREE.Points(sGeo,new THREE.PointsMaterial({
    color:0xcfd8ee,size:2.2,transparent:true,opacity:0.4,
    sizeAttenuation:false,depthWrite:false,fog:false
  }));
  stars.renderOrder=-9;
  scene.add(stars);
  scene.userData.v2stars=stars;

  /* Sun sprite halo */
  var sc=document.createElement('canvas');sc.width=sc.height=256;
  var sg=sc.getContext('2d');
  var grad=sg.createRadialGradient(128,128,0,128,128,128);
  grad.addColorStop(0,'rgba(255,235,200,1)');
  grad.addColorStop(0.12,'rgba(255,205,140,0.85)');
  grad.addColorStop(0.4,'rgba(235,140,70,0.22)');
  grad.addColorStop(1,'rgba(235,140,70,0)');
  sg.fillStyle=grad;sg.fillRect(0,0,256,256);
  var sunSp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:new THREE.CanvasTexture(sc),transparent:true,depthWrite:false,fog:false
  }));
  sunSp.position.copy(V2.SUN_DIR.clone().multiplyScalar(3500));
  sunSp.scale.set(900,900,1);
  scene.add(sunSp);
  scene.userData.v2sunSprite=sunSp;
  return sky;
};

/* soft round particle texture (shared) */
V2.softTex=function(){
  if(V2._softTex)return V2._softTex;
  var c=document.createElement('canvas');c.width=c.height=64;
  var g=c.getContext('2d');
  var gr=g.createRadialGradient(32,32,0,32,32,32);
  gr.addColorStop(0,'rgba(255,255,255,1)');
  gr.addColorStop(0.4,'rgba(255,255,255,0.55)');
  gr.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=gr;g.fillRect(0,0,64,64);
  V2._softTex=new THREE.CanvasTexture(c);
  return V2._softTex;
};

/* cloud puff texture — lumpy, not a plain blob */
V2.cloudTex=function(){
  if(V2._cloudTex)return V2._cloudTex;
  var c=document.createElement('canvas');c.width=256;c.height=128;
  var g=c.getContext('2d');
  for(var i=0;i<26;i++){
    var x=40+Math.random()*176,y=46+Math.random()*44,r=14+Math.random()*30;
    var gr=g.createRadialGradient(x,y,0,x,y,r);
    var a=0.10+Math.random()*0.13;
    gr.addColorStop(0,'rgba(255,255,255,'+a+')');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle=gr;g.fillRect(0,0,256,128);
  }
  V2._cloudTex=new THREE.CanvasTexture(c);
  return V2._cloudTex;
};

/* Broken undercast deck + drifting cumulus + thin cirrus.
   The mission reports an undercast below the formation near the target. */
V2.buildClouds=function(scene){
  var group=new THREE.Group();group.name='v2clouds';
  var tex=V2.cloudTex();
  var puffs=[];
  function puffLayer(n,yBase,yVar,sMin,sVar,op,tint){
    for(var i=0;i<n;i++){
      var m=new THREE.SpriteMaterial({
        map:tex,transparent:true,depthWrite:false,
        opacity:op*(0.6+Math.random()*0.4),
        color:tint||0xb8c4d6
      });
      var sp=new THREE.Sprite(m);
      sp.position.set(
        (Math.random()-0.5)*TER.W*1.05,
        yBase+Math.random()*yVar,
        (Math.random()-0.5)*TER.D*1.05
      );
      var s=sMin+Math.random()*sVar;
      sp.scale.set(s*2.2,s,1);
      sp.userData.drift=0.4+Math.random()*0.8;
      sp.userData.baseOpacity=m.opacity;
      group.add(sp);puffs.push(sp);
    }
  }
  /* low broken deck (below cruise alt ~y95-125) */
  puffLayer(34,42,22,55,80,0.24,0xaab6c8);
  /* mid scattered cumulus */
  puffLayer(14,78,26,40,55,0.16,0xb9c5da);
  /* high thin veil above formation */
  puffLayer(4,190,40,160,160,0.07,0xc6d2e8);
  scene.add(group);
  V2._cloudGroups=V2._cloudGroups||[];
  V2._cloudGroups.push({group:group,puffs:puffs});
  return group;
};

V2.driftClouds=function(dt){
  var route=KM._missionT||0;
  var fadeIn=Math.max(0,Math.min(1,(route-.61)/.04));
  var fadeOut=Math.max(0,Math.min(1,(.96-route)/.04));
  var action=fadeIn*fadeOut;
  var anchor=KM._anchor&&KM._anchor.pos;
  (V2._cloudGroups||[]).forEach(function(cg){
    var eventWeather=cg.group.parent===KM._s&&anchor&&action;
    cg.puffs.forEach(function(sp){
      sp.position.x-=sp.userData.drift*dt*2.2; /* wind from the east */
      if(sp.position.x<-TER.W*0.55)sp.position.x=TER.W*0.55;
      var shade=0;
      if(eventWeather){
        var distance=Math.hypot(sp.position.x-anchor.x,sp.position.z-anchor.z);
        shade=eventWeather*(.78+.22*(1-Math.min(1,distance/(180+sp.scale.x*.55))));
      }
      sp.material.opacity=sp.userData.baseOpacity*(1-.90*shade);
    });
  });
};

/* Scene lighting — believable pre-dawn over the North Sea */
V2.applyLighting=function(scene){
  /* strip any prior lights we own */
  var sun=new THREE.DirectionalLight(0xffe2b8,2.7);
  sun.position.copy(V2.SUN_DIR.clone().multiplyScalar(1600));
  scene.add(sun);
  scene.userData.v2sunLight=sun;
  var hemi=new THREE.HemisphereLight(0x4a5f7d,0x1d160f,1.25);
  scene.add(hemi);
  var amb=new THREE.AmbientLight(0x1a2030,1.05);
  scene.add(amb);
  /* cool counter-fill from the west so silhouettes never go black */
  var fill=new THREE.DirectionalLight(0x5a6f92,0.55);
  fill.position.set(-1200,500,500);
  scene.add(fill);
  return sun;
};
/* ───────────────────── TERRAIN ENGINE ───────────────────── */

V2.FOG_COLOR=0x101826;

/* Build a terrain mesh for any scene. Displaces + textures itself
   when DEM/imagery promises resolve; falls back to stylized
   procedural ground if the network is unavailable. */
function terrainSurfaceHeight(geo,x,z){
  var grid=geo.parameters;
  var col=(x/grid.width+.5)*grid.widthSegments;
  var row=(z/grid.height+.5)*grid.heightSegments;
  if(col<0||row<0||col>grid.widthSegments||row>grid.heightSegments)return undefined;
  var column=Math.min(grid.widthSegments-1,Math.floor(col));
  var line=Math.min(grid.heightSegments-1,Math.floor(row));
  var u=col-column,v=row-line,stride=grid.widthSegments+1;
  var i=line*stride+column,position=geo.attributes.position;
  var b=position.getY(i+stride),d=position.getY(i+1);
  if(u+v<=1)return (1-u-v)*position.getY(i)+v*b+u*d;
  return (1-u)*b+(1-v)*d+(u+v-1)*position.getY(i+stride+1);
}

V2.buildTerrainMesh=function(scene){
  var geo=new THREE.PlaneGeometry(TER.W,TER.D,TER.SEGX,TER.SEGZ);
  geo.rotateX(-Math.PI/2); /* XZ plane, +y up; +z south→north handled by mapping */
  var mat=new THREE.MeshStandardMaterial({
    color:0x35404f,roughness:0.96,metalness:0.0,
    flatShading:false
  });
  var mesh=new THREE.Mesh(geo,mat);
  mesh.name='v2terrain';
  scene.add(mesh);

  /* sea level for the terrain mesh. Was -1.0, more than a full unit
     below the lowest classified "land" near the shoreline (~0.28 right
     at the coast) — that step reads as the water sitting in a trench
     below the coast rather than meeting it, i.e. "water level too low".
     Raising it (and easing the shoreline band down to it below, in
     texture()) keeps water still visibly lower than land but removes
     the cliff. */
  var WATER_Y=-0.3;

  function recordGround(){
    if(scene!==KM._s)return;
    V2.groundAt=function(x,z){return terrainSurfaceHeight(geo,x,z);};
    V2.groundRevision=(V2.groundRevision||0)+1;
  }

  function displace(){
    var pos=geo.attributes.position;
    for(var i=0;i<pos.count;i++){
      var x=pos.getX(i),z=pos.getZ(i);
      var e=V2.elevAt(x,z); /* meters; note plane rotation flips z sign? mapping uses scene z directly */
      var y;
      /* the sea is FLAT terrain at a fixed level — the imagery shows
         the water; no separate plane to fight the coastline */
      if(e<=-8){ y=WATER_Y; }
      else{ y=Math.max(0.6,e*ELEV_SCALE); }
      pos.setY(i,y);
    }
    pos.needsUpdate=true;
    geo.computeVertexNormals();
    recordGround();
  }

  function applyTerrainMap(img,tex){
    tex.encoding=THREE.sRGBEncoding;
    if(KM._ren)tex.anisotropy=KM._ren.capabilities.getMaxAnisotropy();
    tex.wrapS=tex.wrapT=THREE.ClampToEdgeWrapping;
    /* UVs: project each vertex through the geo mapping into the tile rect */
    var pos=geo.attributes.position,uv=geo.attributes.uv;
    for(var i=0;i<pos.count;i++){
      var p=sceneToRectPx(img,pos.getX(i),pos.getZ(i));
      uv.setXY(i,p[0]/(img.cols*256),1-p[1]/(img.rows*256));
    }
    uv.needsUpdate=true;
    mat.map=tex;mat.color.set(0xffffff);
    var container=scene===KM._s?KM._cont:document.getElementById('route-wrap');
    if(container&&!container.querySelector('.km-imagery-credit')){
      var credit=document.createElement('a');
      credit.className='km-imagery-credit';
      credit.href='https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9';
      credit.textContent='Powered by Esri · Imagery © Esri, Vantor, Earthstar Geographics, and the GIS User Community';
      credit.target='_blank';credit.rel='noopener';
      container.appendChild(credit);
    }
    mat.needsUpdate=true;
  }

  function texture(){
    var img=V2.imagery;if(!img)return;
    applyTerrainMap(img,new THREE.CanvasTexture(img.graded));
    /* SATELLITE WATER MASK: the DEM can't tell a polder from a lake
       (both below sea level). The imagery can — only pixels that LOOK
       like water near sea level become sea. Holland stays dry. */
    try{
      var ictx=img.canvas.getContext('2d');
      var iw=img.canvas.width,ih=img.canvas.height;
      var idata=ictx.getImageData(0,0,iw,ih).data;
      function waterPx(o4){
        var r4=idata[o4],g4=idata[o4+1],b4=idata[o4+2];
        return (b4>r4+8&&b4>=g4-2)||(r4<60&&g4<75&&b4>55);
      }
      /* Lake basins (IJsselmeer / Markermeer) read dark GREEN not blue,
         so waterPx misses them. We recolour them to the SEA's own tone
         in the texture — per pixel, following the true shoreline, with
         NO geometry carving (so no blocky rectangles). Bounded to the
         known basins so no inland forest is touched. */
      function _ll2px(lon,lat){
        var tx=(lon+180)/360*Math.pow(2,img.zoom);
        var rr=lat*Math.PI/180;
        var ty=(1-Math.log(Math.tan(rr)+1/Math.cos(rr))/Math.PI)/2*Math.pow(2,img.zoom);
        return [(tx-img.x0)*256,(ty-img.y0)*256];
      }
      var _lakeRects=[
        [4.98,52.30,5.42,52.62],   /* Markermeer */
        [5.02,52.62,5.72,53.05],   /* IJsselmeer */
        [2.45,50.98,4.78,51.88],   /* Zeeland / Scheldt delta — Wester/Ooster-Schelde, Haringvliet, Hollands Diep, extended W/S to the Ostend feet-wet crossing on the return leg */
        [4.75,52.95,6.45,53.55],   /* Wadden Sea (mainland<->Frisian islands) */
        [4.25,52.15,5.65,52.97]    /* North Holland coastal corridor — IJmuiden landfall, Zaan/Alkmaar polder channels, bridges the Markermeer/IJsselmeer boxes up to the Wadden Sea box so the route's actual feet-dry crossing point isn't left in a gap */
      ].map(function(B){
        var a=_ll2px(B[0],B[3]),b=_ll2px(B[2],B[1]);
        return [Math.max(0,Math.min(iw-1,Math.round(Math.min(a[0],b[0])))),
                Math.max(0,Math.min(ih-1,Math.round(Math.min(a[1],b[1])))),
                Math.max(0,Math.min(iw-1,Math.round(Math.max(a[0],b[0])))),
                Math.max(0,Math.min(ih-1,Math.round(Math.max(a[1],b[1]))))];
      });
      function _isLakeWater(o4){var r4=idata[o4],g4=idata[o4+1],b4=idata[o4+2];
        return r4<78&&g4<120&&(g4-b4)<40&&b4>r4-14;}
      /* vertex pass: water flat at −1.0, land never below 0.6 */
      for(var vi2=0;vi2<pos.count;vi2++){
        var ex=V2.elevAt(pos.getX(vi2),pos.getZ(vi2));
        if(ex>2)continue;
        var pp=sceneToRectPx(img,pos.getX(vi2),pos.getZ(vi2));
        var px2=Math.max(0,Math.min(iw-1,Math.round(pp[0]))),
            py2=Math.max(0,Math.min(ih-1,Math.round(pp[1])));
        var isW=waterPx((py2*iw+px2)*4);
        /* land that's barely above sea level (marsh, tidal flat, polder
           the masking above didn't catch) used to snap straight up to
           the 0.6 floor — right at the shoreline that read as a thin
           raised green collar sitting on top of the water, i.e. "water
           that's too low". Ease the floor in across the −8..2m band
           instead of a hard jump, so unclassified near-sea-level land
           blends down toward the waterline rather than fighting it. */
        var landY;
        if(ex<2){
          var se=Math.max(0,Math.min(1,(ex+8)/10));   /* 0 at −8m, 1 at 2m */
          landY=WATER_Y+se*(0.6-WATER_Y);             /* WATER_Y .. 0.6 */
        }else{
          landY=Math.max(0.6,ex*ELEV_SCALE);
        }
        pos.setY(vi2,isW?WATER_Y:landY);
      }
      pos.needsUpdate=true;
      geo.computeVertexNormals();
      recordGround();
      /* per-pixel ROUGHNESS map: water glossy, land matte — the sheen
         lives on the real map, no overlay plane, no jagged coastline */
      var gctx=img.graded.getContext('2d');
      var gimg=gctx.getImageData(0,0,iw,ih),gd=gimg.data;
      var rc=document.createElement('canvas');rc.width=iw;rc.height=ih;
      var rg=rc.getContext('2d');
      var rd=rg.createImageData(iw,ih);
      var seaR=0,seaG=0,seaB=0,seaN=0;
      for(var pi4=0;pi4<iw*ih;pi4++){
        var o4r=pi4*4, isSea=waterPx(o4r);
        rd.data[o4r]=255;            /* AO channel unused */
        rd.data[o4r+1]=isSea?38:225; /* G = roughness */
        rd.data[o4r+2]=0;            /* B = metalness (off) */
        rd.data[o4r+3]=255;
        if(isSea){seaR+=gd[o4r];seaG+=gd[o4r+1];seaB+=gd[o4r+2];seaN++;}
      }
      /* the sea's own averaged tone (fallback: dawn blue-teal) */
      var sR=seaN?seaR/seaN:30,sG=seaN?seaG/seaN:54,sB=seaN?seaB/seaN:72;
      var lakeHit=0;
      _lakeRects.forEach(function(R){
        /* defensive cap: a mis-projected box (corner clamps to two
           opposite edges of the canvas) can balloon into a multi-million-
           pixel scan that blocks the main thread long enough to read as
           a freeze/crash. Skip anything absurd instead of trusting the
           geocoding math blindly — this guards every rect, old and new. */
        var rw=R[2]-R[0]+1,rh=R[3]-R[1]+1;
        if(rw<=0||rh<=0||rw*rh>1500000){
          if(typeof console!=='undefined')console.warn('KM v2: skipping oversized lakeRect scan',R,rw*rh);
          return;
        }
        for(var yy=R[1];yy<=R[3];yy++){var row=yy*iw;
          for(var xx=R[0];xx<=R[2];xx++){var o=(row+xx)*4;
            if(waterPx(o)||!_isLakeWater(o))continue;
            var jt=(idata[o]&15)-7;
            gd[o]=Math.max(0,Math.min(255,sR+jt));
            gd[o+1]=Math.max(0,Math.min(255,sG+jt));
            gd[o+2]=Math.max(0,Math.min(255,sB+jt));
            rd.data[o+1]=46;          /* glossy water sheen */
            lakeHit++;
          }
        }
      });
      if(lakeHit){gctx.putImageData(gimg,0,0);tex.needsUpdate=true;}
      rg.putImageData(rd,0,0);
      var rTex=new THREE.CanvasTexture(rc);
      rTex.wrapS=rTex.wrapT=THREE.ClampToEdgeWrapping;
      mat.roughnessMap=rTex;
      mat.roughness=1;
    }catch(eM){/* canvas tainted or unavailable — keep DEM result */}
    var nm=V2.buildNormalMap();
    if(nm){
      var nt=new THREE.CanvasTexture(nm);
      /* DEM rect ≠ imagery rect, but UVs were set for imagery. Build a
         second UV-independent trick: reproject normal map into the
         imagery rect space via canvas draw. */
      var c=document.createElement('canvas');
      c.width=1024;c.height=1024;
      var ctx=c.getContext('2d');
      /* draw DEM-normal canvas remapped onto imagery extents */
      var d=V2.dem,im=V2.imagery;
      /* compute where the imagery rect corners fall inside the DEM rect */
      function imgCornerToDem(u,v){
        /* imagery px → lon/lat → dem px */
        var lon=tile2lon(im.x0+u*im.cols,im.zoom);
        var lat=tile2lat(im.y0+v*im.rows,im.zoom);
        var px=(lon2tile(lon,d.zoom)-d.x0)*256;
        var py=(lat2tile(lat,d.zoom)-d.y0)*256;
        return [px,py];
      }
      var p00=imgCornerToDem(0,0),p11=imgCornerToDem(1,1);
      var sx=c.width/(p11[0]-p00[0]),sy=c.height/(p11[1]-p00[1]);
      ctx.setTransform(sx,0,0,sy,-p00[0]*sx,-p00[1]*sy);
      ctx.drawImage(nm,0,0);
      ctx.setTransform(1,0,0,1,0,0);
      mat.normalMap=new THREE.CanvasTexture(c);
      mat.normalScale=new THREE.Vector2(0.85,0.85);
    }
    mat.needsUpdate=true;
  }

  /* Stylized fallback (port of the original hand-built coastline) */
  function fallback(){
    var EC=[[-640,-400],[-660,-320],[-670,-250],[-680,-180],[-690,-120],[-710,-60],[-730,0],[-720,50],[-700,80],[-680,130],[-720,200],[-660,290],[-600,360],[-560,400]];
    var CC=[[-250,-300],[-240,-220],[-230,-150],[-210,-80],[-200,-30],[-210,20],[-230,100],[-250,180],[-300,300],[-400,420]];
    function cX(pts,z){if(z<=pts[0][1])return pts[0][0];for(var i=1;i<pts.length;i++){if(z<=pts[i][1]){var t=(z-pts[i-1][1])/(pts[i][1]-pts[i-1][1]);return pts[i-1][0]+t*(pts[i][0]-pts[i-1][0]);}}return pts[pts.length-1][0];}
    function isL(x,z){if(x<-480)return x<cX(EC,z)?1:0;if(x>-320&&x<-100)return x>cX(CC,z)?1:0;if(x>-100)return 1;return 0;}
    var pos=geo.attributes.position;
    for(var i=0;i<pos.count;i++){
      var x=pos.getX(i),z=pos.getZ(i),e=-7;
      if(isL(x,z)){
        e=3+Math.sin(x*0.012+z*0.009)*4+Math.cos(x*0.03-z*0.02)*2;
        if(x>0)e+=4+x*0.02+Math.sin(x*0.01+z*0.008)*8;
        var kd=Math.sqrt((x-500)*(x-500)+(z+200)*(z+200));
        if(kd<220)e+=(220-kd)*0.14;
        e=Math.max(0.6,e);
      }
      pos.setY(i,e);
    }
    pos.needsUpdate=true;geo.computeVertexNormals();
    mat.color.set(0x2c3a30);
    recordGround();
  }

  V2.loadDEM().then(function(){displace();
    return V2.loadImagery().then(function(imagery){if(imagery)texture();}).catch(function(){
      console.warn('KM v2: imagery unavailable, retaining elevation geometry');
    });
  }).catch(function(err){
    console.warn('KM v2: elevation unavailable, using fallback terrain',err);
    fallback();
  });

  return mesh;
};

/* Water — keeps the geometry layout the original animation loop
   shimmers (PlaneGeometry segments mutated per-frame). */
V2.buildWater=function(scene){
  var wGeo=new THREE.PlaneGeometry(TER.W,TER.D,80,50);
  wGeo.rotateX(-Math.PI/2);
  /* scrolling procedural normal for wavelets */
  var nc=document.createElement('canvas');nc.width=nc.height=256;
  var g=nc.getContext('2d');
  g.fillStyle='#8080ff';g.fillRect(0,0,256,256);
  for(var i=0;i<2400;i++){
    var x=Math.random()*256,y=Math.random()*256,r=1+Math.random()*2.5;
    var dx=(Math.random()-0.5),dy=(Math.random()-0.5);
    g.fillStyle='rgba('+Math.round(128+dx*70)+','+Math.round(128+dy*70)+',255,0.35)';
    g.beginPath();g.arc(x,y,r,0,7);g.fill();
  }
  var nTex=new THREE.CanvasTexture(nc);
  nTex.wrapS=nTex.wrapT=THREE.RepeatWrapping;nTex.repeat.set(14,10);
  var mat=new THREE.MeshStandardMaterial({
    color:0x0c2033,roughness:0.38,metalness:0.5,
    normalMap:nTex,normalScale:new THREE.Vector2(0.55,0.55),
    transparent:true,opacity:0.94
  });
  var water=new THREE.Mesh(wGeo,mat);
  water.position.y=-1.6;
  /* retired: the satellite terrain now renders its own water with a
     glossy roughness mask — the overlay plane made jagged coastlines */
  water.visible=false;
  scene.add(water);
  V2._waterTexes=V2._waterTexes||[];
  V2._waterTexes.push(nTex);
  return water;
};

V2.scrollWater=function(dt){
  (V2._waterTexes||[]).forEach(function(t){t.offset.x+=dt*0.008;t.offset.y+=dt*0.005;});
};

/* ─────────────── LABELS / MARKERS / ROUTE ─────────────── */
V2.makeLabel=function(scene,text,pos,color,big){
  /* canvas sized to the TEXT — long labels no longer clip */
  var fs=big?52:40;
  var meas=document.createElement('canvas').getContext('2d');
  meas.font='600 '+fs+'px Oswald, Arial, sans-serif';
  var tw=Math.ceil(meas.measureText(text.toUpperCase()).width)+60;
  var c=document.createElement('canvas');c.width=Math.max(256,tw);c.height=128;
  var ctx=c.getContext('2d');
  ctx.font='600 '+fs+'px Oswald, Arial, sans-serif';
  ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.shadowColor='rgba(0,0,0,0.9)';ctx.shadowBlur=14;
  ctx.fillStyle=color||'rgba(255,255,255,0.34)';
  ctx.fillText(text.toUpperCase(),c.width/2,64);
  var tex=new THREE.CanvasTexture(c);
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));
  sp.userData.geoMarker=true;
  var sH=big?27:21;
  sp.position.copy(pos);sp.scale.set(sH*c.width/128,sH,1);
  scene.add(sp);
  return sp;
};

V2.cityDot=function(scene,x,y,z,col){
  var s=new THREE.Mesh(new THREE.SphereGeometry(2.2,10,10),
    new THREE.MeshBasicMaterial({color:col||0xffffff}));
  s.position.set(x,y,z);scene.add(s);
  s.userData.geoMarker=true;
  var halo=new THREE.Sprite(new THREE.SpriteMaterial({
    map:V2.softTex(),color:col||0xffffff,transparent:true,
    opacity:0.3,depthWrite:false,blending:THREE.AdditiveBlending}));
  halo.position.set(x,y,z);halo.scale.set(9,9,1);scene.add(halo);
  halo.userData.geoMarker=true;
};

V2.addGeoLabels=function(scene){
  function place(name,lon,lat,col,dotCol,big){
    var xz=GEO.lonLatToXZ(lon,lat);
    var y=Math.max(2,(V2.demReady?V2.elevAt(xz[0],xz[1]):20)*ELEV_SCALE);
    if(dotCol)V2.cityDot(scene,xz[0],y+4,xz[1],dotCol);
    V2.makeLabel(scene,name,new THREE.Vector3(xz[0],y+22,xz[1]),col,big);
  }
  /* regions */
  V2.makeLabel(scene,'ENGLAND',new THREE.Vector3(-760,42,-140),'rgba(255,255,255,0.16)',true);
  V2.makeLabel(scene,'NORTH SEA',new THREE.Vector3(-420,26,30),'rgba(120,165,210,0.17)',true);
  V2.makeLabel(scene,'NETHERLANDS',new THREE.Vector3(-110,24,-30),'rgba(255,255,255,0.14)',true);
  V2.makeLabel(scene,'GERMANY',new THREE.Vector3(300,46,90),'rgba(255,255,255,0.16)',true);
  /* cities (true coordinates) */
  place('Tibenham',1.159,52.454,'rgba(255,196,1,0.5)',0xFFC401);
  place('Norwich',1.297,52.628,'rgba(255,255,255,0.22)',0x9aa3b2);
  place('Amsterdam',4.90,52.37,'rgba(255,255,255,0.22)',0x9aa3b2);
  place('Hannover',9.73,52.37,'rgba(255,255,255,0.22)',0x9aa3b2);
  place('Göttingen — bombed in error',9.93,51.53,'rgba(204,88,88,0.5)',0xcc4444);
  place('Eisenach',10.31,50.98,'rgba(204,88,88,0.45)',0xcc4444);
  place('Kassel — briefed target',9.49,51.31,'rgba(255,196,1,0.45)',0xFFC401);
  place('briefed route',9.05,50.62,'rgba(159,184,212,0.45)',0x9fb8d4);
  place('NAVIGATION ERROR',8.64,51.36,'rgba(231,76,60,0.65)',0xe74c3c);
  place('Wiesbaden',8.24,50.08,'rgba(255,179,71,0.4)',0xFFB347);
  place('Luxembourg',6.13,49.61,'rgba(255,179,71,0.4)',0xFFB347);
  place('Ostend',2.92,51.21,'rgba(111,230,242,0.45)',0x6fe6f2);
  place('Brussels',4.35,50.85,'rgba(111,230,242,0.4)',0x6fe6f2);
};

/* ═══ SOURCE-CONSTRAINED RECONSTRUCTION — NOT AN EXACT RECORDED TRACK ═══
   The misplaced southern leg has been replaced by Whitefield's inferred
   attack region and a transcribed return fix. Connecting curvature,
   early-route geometry, altitudes and loss timings remain illustrative.
   See reference/BATTLE-ROUTE-CONTRADICTION.md for evidence and limits.
   The 445th followed the division stream to the IP, then the lead
   formation turned EAST too early — the wrong turn — separating the
   group from the stream and its escort. They bombed near Göttingen
   in error, and were hit by the Sturmgruppen on the rally leg
   south-west of Göttingen, right over the crash-site country.
   The BRIEFED route (dashed) carries on from the IP to Kassel —
   that's where everyone else, including the escort, went. */
V2.routeGeo=[
  [1.159,52.454,35],[3.10,52.58,55],          /* Tibenham -> ENE across the North Sea */
  [4.62,52.47,80],                            /* landfall N of IJmuiden 08:48 (Cruel Sky) */
  [5.20,52.10,94],[5.55,51.78,104],           /* turn SE across Holland */
  [6.90,51.66,110],                           /* into Germany */
  [7.75,51.50,114],                           /* descending toward the IP */
  [8.64,51.36,116],                           /* THE IP - the briefed turn was not completed */
  [9.34,51.46,116],                           /* the run drifts NE - not E to Kassel */
  [9.93,51.53,116],                           /* Goettingen - bombs away in error */
  [10.21,51.68,116],                          /* estimated NE rally, course 50; connecting curvature is illustrative */
  /* Authored broad right-turn interpolation, not measured fixes.
     A single NE corner formerly forced a tight reversal into the
     southbound leg. Distribute the change over a regional-radius arc. */
  [10.35,51.68,116],[10.46,51.62,115],
  [10.48,51.53,115],[10.40,51.43,114],
  [10.30,51.35,113],[10.19,51.16,111],
  [10.0366700847,50.9853874632,109],           /* inferred 1003 attack region: Whitefield reverse projection, NOT observed fix */
  [9.69,50.88,105]                            /* estimated 1009 continuation on the 245-degree return track */
];
/* Fixed documentary cues must map to their intended geographic events,
   not proportional distance along the entire outbound route. */
V2.routeEventGeo=[
  [0,1.159,52.454],[.65,9.93,51.53],
  [.84,10.0366700847,50.9853874632],[.92,9.69,50.88],[1,1.159,52.454]
];
V2.briefedGeo=[[8.64,51.36,116],[9.10,51.34,116],[9.49,51.31,116],[9.55,50.92,114],[9.05,50.50,110],[8.20,50.10,98],[6.10,49.70,88]]; /* the BRIEFED route: IP -> bomb KASSEL -> withdraw SW to rejoin the stream */ /* intended: ESE to Kassel */
/* ═══ THE 355th FIGHTER GROUP's OWN ROUTE (VIII F.C. F.O. 570) ═══
   The escort did NOT fly the bombers' northern North-Sea track. Per
   the 355th's own map they crossed the Channel near Dover, made
   landfall over Belgium, and swept ESE — Brussels, Liège, Koblenz —
   to the Kassel target area, where they orbited waiting for the heavies.
   When the 445th made the wrong turn it flew AWAY from this cover. */
V2.fighterGeo=[
  [-0.30,51.95,30],[1.20,51.25,70],   /* England → Channel (Dover) */
  [2.90,51.18,100],                   /* Ostend — landfall over Belgium */
  [4.35,50.85,116],[5.57,50.63,122],  /* Brussels → Liège */
  [7.40,50.48,124],[8.80,50.92,123],  /* Koblenz → climbing NE */
  [9.49,51.31,121]                    /* Kassel — the target sweep */
];
/* THE BRIEFED SOUTHERN RETURN LOOP, read off the 445th's own mission
   map: outbound runs the NORTHERN track (Zuider Zee then east to the IP);
   the route home swings SOUTH - down past Frankfurt, SW over Luxembourg
   and Belgium, feet-wet near the Belgian coast, then across the Channel
   to Tibenham. It is a LOOP, never a retrace of the way in. */
V2.returnGeo=[
  [9.69,50.88,105],[9.2833333333,50.7666666667,101], /* attack continuation -> transcribed 1016 radar fix */
  [8.16,50.20,97],                           /* subsequent connecting route remains illustrative */
  [6.10,49.70,88],                            /* WEST toward Luxembourg */
  [4.00,50.30,72],[2.90,51.18,52],            /* NW across Belgium -> Ostend (feet wet) */
  [1.30,52.30,18],[1.159,52.454,4]            /* Channel -> Norwich -> home */
]

V2.buildRoute=function(scene){
  function toPts(geoList){
    return geoList.map(function(g){
      var xz=GEO.lonLatToXZ(g[0],g[1]);
      return new THREE.Vector3(xz[0],g[2],xz[1]);
    });
  }
  var pts=toPts(V2.routeGeo);
  var curve=new THREE.CatmullRomCurve3(pts,false,'centripetal');
  var rPts=toPts(V2.returnGeo);
  var rCurve=new THREE.CatmullRomCurve3(rPts,false,'centripetal');
  /* ONE merged outbound+return curve — the formation samples THIS so
     there is no seam (no lateral-offset flip) at the return handoff. The
     two-phase mission timing is preserved separately via arc mapping. */
  var fullPts=pts.concat(rPts.slice(1));
  var fullCurve=new THREE.CatmullRomCurve3(fullPts,false,'centripetal');
  /* ── ONE clean 445th track ── outbound + wrong turn + battle + the
     southern return loop, as a SINGLE continuous gold line. No glow
     tubes, no shadow, no duplicate return line — just the path. */
  var bomberPath=curve.getPoints(340).concat(rCurve.getPoints(200));
  scene.add(new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(bomberPath),
    new THREE.LineBasicMaterial({color:0xCDC9BC,transparent:true,opacity:0.72})));  /* restrained chart line, not neon gold */
  /* the BRIEFED route the 445th SHOULD have flown — from the IP to
     bomb Kassel, then withdraw SW with the stream. Drawn faint and
     transparent: the road not taken. */
  var bPts=toPts(V2.briefedGeo);
  var bCurve=new THREE.CatmullRomCurve3(bPts,false,'centripetal');
  var bLine=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(bCurve.getPoints(90)),
    new THREE.LineDashedMaterial({color:0x6ec6ff,transparent:true,opacity:0.62,dashSize:9,gapSize:5,linewidth:2}));
  bLine.computeLineDistances();scene.add(bLine);
  /* a soft glow twin underneath the dashes — cheap way to read clearly
     over both dark water and busy satellite terrain without a custom
     shader line */
  var bGlow=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(bCurve.getPoints(90)),
    new THREE.LineBasicMaterial({color:0x6ec6ff,transparent:true,opacity:0.16}));
  bGlow.position.y+=0.4;scene.add(bGlow);
  /* (the 355th's separate cyan corridor was removed — the escorts now
     fly WITH the bombers then break for Kassel at the IP, so a second
     drawn route only confused the picture) */
  var fPts=toPts(V2.fighterGeo);
  var fCurve=new THREE.CatmullRomCurve3(fPts);
  /* sky legend over each route */
  V2.makeLabel(scene,'445th BOMB GROUP',new THREE.Vector3(120,118,-90),'rgba(214,208,190,0.8)',true);
  return {curve:curve,pts:pts,briefed:bCurve,home:rCurve,fighter:fCurve,full:fullCurve};
};

/* ════════════ KM._build3DTerrain — FULL REPLACEMENT ════════════ */
KM._build3DTerrain=function(){
  if(KM.terrainInit)return;KM.terrainInit=true;
  var container=document.getElementById('terrain-wrap');KM._cont=container;
  var canvas=document.getElementById('terrain-canvas');KM._canv=canvas;
  if(!container||!canvas){console.error('KM v2: no terrain container');return;}
  var w=container.clientWidth,h=container.clientHeight;
  if(w<10)w=container.offsetWidth||800;
  if(h<10)h=canvas.offsetHeight||500;

  var scene=new THREE.Scene();KM._s=scene;
  scene.fog=new THREE.FogExp2(V2.FOG_COLOR,0.00052);

  var camera=new THREE.PerspectiveCamera(50,w/h,1,9000);KM._cam=camera;
  camera.position.set(0,500,800);camera.lookAt(0,0,0);

  var renderer;
  try{renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});}
  catch(e){
    /* transient WebGL context failure — allow the boot watchdog to retry */
    console.warn('KM v2: WebGL context failed, will retry',e);
    KM.terrainInit=false;return;
  }
  KM._ren=renderer;
  renderer.setSize(w,h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,w<600?1:1.5));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;

  V2.applyLighting(scene);
  V2.buildSky(scene);
  V2.buildTerrainMesh(scene);
  KM._water=V2.buildWater(scene);
  V2.buildClouds(scene);

  var route=V2.buildRoute(scene);
  KM._curve=route.curve;KM._pts=route.pts;
  KM._briefed=route.briefed;KM._home=route.home;KM._fighterCurve=route.fighter;
  KM._full=route.full;

  V2.loadDEM().then(function(){V2.addGeoLabels(scene);})
    .catch(function(){V2.addGeoLabels(scene);});

  console.log('KM v2: terrain engine built');
};
/* ───────────────────── AIRCRAFT FACTORY V2 ─────────────────────
   High-fidelity procedural warbirds. Same outer dimensions and the
   same userData conventions (isProp spinners) as v1, so formation,
   battle and camera blocks work unchanged. Heavy use of geometry
   merging keeps draw calls at ~11 objects per B-24. */

/* ---------- small geometry utils ---------- */
function xformGeo(g,px,py,pz,rx,ry,rz,sx,sy,sz){
  var m=new THREE.Matrix4();
  var q=new THREE.Quaternion().setFromEuler(new THREE.Euler(rx||0,ry||0,rz||0));
  m.compose(new THREE.Vector3(px||0,py||0,pz||0),q,
            new THREE.Vector3(sx||1,sy||1,sz||1));
  g.applyMatrix4(m);
  return g;
}
function remapUV(g,u0,v0,u1,v1){
  var uv=g.attributes.uv;if(!uv)return g;
  for(var i=0;i<uv.count;i++){
    uv.setXY(i,u0+uv.getX(i)*(u1-u0),v0+uv.getY(i)*(v1-v0));
  }
  return g;
}
/* planar-project UVs from the geometry's own XY bounds into a region */
function planarUV(g,u0,v0,u1,v1,axis){
  axis=axis||'xy';
  g.computeBoundingBox();
  var bb=g.boundingBox,pos=g.attributes.position;
  var uvArr=new Float32Array(pos.count*2);
  for(var i=0;i<pos.count;i++){
    var a,b;
    if(axis==='xy'){a=(pos.getX(i)-bb.min.x)/Math.max(1e-5,bb.max.x-bb.min.x);
                    b=(pos.getY(i)-bb.min.y)/Math.max(1e-5,bb.max.y-bb.min.y);}
    else{a=(pos.getX(i)-bb.min.x)/Math.max(1e-5,bb.max.x-bb.min.x);
         b=(pos.getZ(i)-bb.min.z)/Math.max(1e-5,bb.max.z-bb.min.z);}
    uvArr[i*2]=u0+a*(u1-u0);uvArr[i*2+1]=v0+b*(v1-v0);
  }
  g.setAttribute('uv',new THREE.BufferAttribute(uvArr,2));
  return g;
}
function solidUV(g,u,v){
  var pos=g.attributes.position;
  var uvArr=new Float32Array(pos.count*2);
  for(var i=0;i<pos.count;i++){uvArr[i*2]=u;uvArr[i*2+1]=v;}
  g.setAttribute('uv',new THREE.BufferAttribute(uvArr,2));
  return g;
}
function mergeGeos(list){
  var vTotal=0,iTotal=0;
  list.forEach(function(g){
    if(!g.attributes.normal)g.computeVertexNormals();
    vTotal+=g.attributes.position.count;
    iTotal+=(g.index?g.index.count:g.attributes.position.count);
  });
  var pos=new Float32Array(vTotal*3),norm=new Float32Array(vTotal*3),uv=new Float32Array(vTotal*2);
  var idx=vTotal>65535?new Uint32Array(iTotal):new Uint16Array(iTotal);
  var vo=0,io=0;
  function copyAttr(attr,dst,off,items){
    if(!attr)return;
    /* fast path for plain, tightly-packed attributes */
    if(attr.array&&!attr.isInterleavedBufferAttribute&&attr.array.length===attr.count*items){
      dst.set(attr.array,off);return;
    }
    for(var i=0;i<attr.count;i++){
      dst[off+i*items]=attr.getX(i);
      if(items>1)dst[off+i*items+1]=attr.getY(i);
      if(items>2)dst[off+i*items+2]=attr.getZ(i);
    }
  }
  list.forEach(function(g){
    copyAttr(g.attributes.position,pos,vo*3,3);
    copyAttr(g.attributes.normal,norm,vo*3,3);
    copyAttr(g.attributes.uv,uv,vo*2,2);
    if(g.index){for(var i=0;i<g.index.count;i++)idx[io++]=g.index.array[i]+vo;}
    else{for(var j=0;j<g.attributes.position.count;j++)idx[io++]=vo+j;}
    vo+=g.attributes.position.count;
  });
  var out=new THREE.BufferGeometry();
  out.setAttribute('position',new THREE.BufferAttribute(pos,3));
  out.setAttribute('normal',new THREE.BufferAttribute(norm,3));
  out.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  out.setIndex(new THREE.BufferAttribute(idx,1));
  KasselAircraftMaterialGeometry.extraAttributes(THREE,list,out);
  return out;
}

/* Loft a wing/stab panel: airfoil sections swept along +z (mirrored
   for the left side). Chord along +x, LE forward. */
function loftPanel(o){
  /* o: {span, c0, c1, t0, t1, sweep, dihedral, segs, mirror} */
  var foilX=[1.0,0.7,0.45,0.25,0.1,0.02,0,0.02,0.1,0.25,0.45,0.7,1.0];
  var foilY=[0.008,0.55,0.85,1.0,0.85,0.45,0,-0.28,-0.42,-0.48,-0.40,-0.25,-0.008];
  var S=o.segs||5,M=foilX.length;
  var pos=[],uv=[],idx=[];
  for(var s=0;s<S;s++){
    var f=s/(S-1);
    var chord=o.c0+(o.c1-o.c0)*f;
    var th=(o.t0+(o.t1-o.t0)*f)*chord;
    var cx=-o.sweep*f, cy=o.dihedral*f;
    var z=(o.mirror?-1:1)*o.span*f;
    for(var m=0;m<M;m++){
      pos.push(cx+chord*(0.32-foilX[m]), cy+th*foilY[m], z);
      uv.push(m/(M-1), f);
    }
  }
  for(var s2=0;s2<S-1;s2++){
    for(var m2=0;m2<M-1;m2++){
      var a=s2*M+m2,b=a+1,c=a+M,d=c+1;
      if(o.mirror){idx.push(a,c,b, b,c,d);}else{idx.push(a,b,c, b,d,c);}
    }
  }
  /* tip cap */
  var tip0=(S-1)*M;
  for(var m3=1;m3<M-1;m3++){
    if(o.mirror)idx.push(tip0,tip0+m3+1,tip0+m3);
    else idx.push(tip0,tip0+m3,tip0+m3+1);
  }
  var g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(pos),3));
  g.setAttribute('uv',new THREE.BufferAttribute(new Float32Array(uv),2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/* ---------- texture atlas painting ---------- */
function mottle(ctx,x,y,w,h,colors,n,rMin,rMax,alpha){
  for(var i=0;i<n;i++){
    var cx=x+Math.random()*w,cy=y+Math.random()*h;
    var r=rMin+Math.random()*(rMax-rMin);
    ctx.fillStyle=colors[Math.floor(Math.random()*colors.length)];
    ctx.globalAlpha=alpha*(0.4+Math.random()*0.6);
    ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();
  }
  ctx.globalAlpha=1;
}
function panelLines(ctx,x,y,w,h,nv,nh,alpha){
  ctx.strokeStyle='rgba(0,0,0,'+alpha+')';ctx.lineWidth=1;
  for(var i=1;i<nv;i++){
    ctx.beginPath();ctx.moveTo(x+w*i/nv,y);ctx.lineTo(x+w*i/nv,y+h);ctx.stroke();
  }
  for(var j=1;j<nh;j++){
    ctx.beginPath();ctx.moveTo(x,y+h*j/nh);ctx.lineTo(x+w,y+h*j/nh);ctx.stroke();
  }
}
function drawStar(ctx,cx,cy,r,bars){
  /* US national insignia: white star on insignia-blue disc + side bars */
  ctx.save();
  ctx.fillStyle='#243a5e';
  if(bars){
    ctx.fillRect(cx-r*1.9,cy-r*0.55,r*3.8,r*1.1);
  }
  ctx.beginPath();ctx.arc(cx,cy,r,0,7);ctx.fill();
  if(bars){
    ctx.fillStyle='#cdd2d6';
    ctx.fillRect(cx-r*1.75,cy-r*0.42,r*0.75,r*0.84);
    ctx.fillRect(cx+r*1.0,cy-r*0.42,r*0.75,r*0.84);
  }
  ctx.fillStyle='#cdd2d6';
  ctx.beginPath();
  for(var i=0;i<5;i++){
    var a=-Math.PI/2+i*2*Math.PI/5;
    var ax=cx+Math.cos(a)*r*0.9,ay=cy+Math.sin(a)*r*0.9;
    var b=a+Math.PI/5;
    var bx=cx+Math.cos(b)*r*0.38,by=cy+Math.sin(b)*r*0.38;
    if(i===0)ctx.moveTo(ax,ay);else ctx.lineTo(ax,ay);
    ctx.lineTo(bx,by);
  }
  ctx.closePath();ctx.fill();
  ctx.restore();
}

/* B-24 atlas. Regions (u,v in 0..1, y-down canvas → v flipped on use):
   FUSE  u[0,1]      v[0.64,1]
   WING  u[0,0.48]   v[0.32,0.62]
   TAIL  u[0.52,0.78] v[0.32,0.62]
   NAC   u[0.80,1]   v[0.32,0.62]
   SWATCH dark u .02 v .03 / olive u .10 v .03 / gray u .18 v .03 / yellow u .26 v .03 */
V2.b24Atlas=function(){
  if(V2._b24Atlas)return V2._b24Atlas;
  var c=document.createElement('canvas');c.width=c.height=1024;
  var x=c.getContext('2d');
  function reg(u0,v0,u1,v1){return {x:u0*1024,y:(1-v1)*1024,w:(u1-u0)*1024,h:(v1-v0)*1024};}

  /* FUSELAGE band — circumferential u, lengthwise v(tail→nose) */
  var F=reg(0,0.64,1,1);
  /* olive base; belly band in neutral gray painted over the wrap */
  x.fillStyle='#4d5736';x.fillRect(F.x,F.y,F.w,F.h);
  /* lower half of the wrap (u .25–.75 ≈ belly) in neutral gray */
  var bg=x.createLinearGradient(F.x,0,F.x+F.w,0);
  bg.addColorStop(0,'rgba(122,128,130,0)');
  bg.addColorStop(0.22,'rgba(122,128,130,0)');
  bg.addColorStop(0.34,'rgba(122,128,130,1)');
  bg.addColorStop(0.66,'rgba(122,128,130,1)');
  bg.addColorStop(0.78,'rgba(122,128,130,0)');
  bg.addColorStop(1,'rgba(122,128,130,0)');
  x.fillStyle=bg;x.fillRect(F.x,F.y,F.w,F.h);
  mottle(x,F.x,F.y,F.w,F.h,['#434c2e','#57613c','#3c452a'],260,4,16,0.10);
  panelLines(x,F.x,F.y,F.w,F.h,2,22,0.18); /* station frames along length */
  panelLines(x,F.x,F.y,F.w,F.h,8,1,0.10);  /* longerons */
  /* exhaust/dirt streaks along length */
  x.globalAlpha=0.08;x.fillStyle='#15170f';
  for(var s=0;s<26;s++){
    var sy=F.y+Math.random()*F.h;
    x.fillRect(F.x+Math.random()*F.w*0.3,sy,F.w*(0.2+Math.random()*0.5),1.5+Math.random()*2);
  }
  x.globalAlpha=1;
  /* side insignia (left/right of wrap) — aft fuselage v≈0.30 of band */
  drawStar(x,F.x+F.w*0.115,F.y+F.h*0.68,26,true);
  drawStar(x,F.x+F.w*0.885,F.y+F.h*0.68,26,true);
  /* waist windows */
  x.fillStyle='#0c0e12';
  x.fillRect(F.x+F.w*0.095,F.y+F.h*0.52,F.w*0.04,F.h*0.07);
  x.fillRect(F.x+F.w*0.865,F.y+F.h*0.52,F.w*0.04,F.h*0.07);

  /* WING */
  var W=reg(0,0.32,0.48,0.62);
  x.fillStyle='#49532f';x.fillRect(W.x,W.y,W.w,W.h);
  mottle(x,W.x,W.y,W.w,W.h,['#3f4829','#535e36'],160,5,18,0.10);
  panelLines(x,W.x,W.y,W.w,W.h,10,4,0.16);
  /* walkway */
  x.globalAlpha=0.35;x.fillStyle='#23291a';
  x.fillRect(W.x,W.y+W.h*0.1,W.w*0.16,W.h*0.8);x.globalAlpha=1;
  /* star on outboard wing */
  drawStar(x,W.x+W.w*0.78,W.y+W.h*0.5,30,false);

  /* TAIL */
  var T=reg(0.52,0.32,0.78,0.62);
  x.fillStyle='#4d5736';x.fillRect(T.x,T.y,T.w,T.h);
  mottle(x,T.x,T.y,T.w,T.h,['#434c2e','#57613c'],60,4,12,0.10);
  /* rudder fabric ribs */
  x.strokeStyle='rgba(0,0,0,0.18)';
  for(var r=1;r<8;r++){
    x.beginPath();x.moveTo(T.x+T.w*0.55,T.y+T.h*r/8);
    x.lineTo(T.x+T.w,T.y+T.h*r/8);x.stroke();
  }
  x.strokeStyle='rgba(0,0,0,0.28)';
  x.beginPath();x.moveTo(T.x+T.w*0.55,T.y);x.lineTo(T.x+T.w*0.55,T.y+T.h);x.stroke();
  /* serial stencil */
  x.fillStyle='rgba(220,220,200,0.65)';
  x.font='600 18px monospace';x.fillText('242527',T.x+T.w*0.18,T.y+T.h*0.45);

  /* NACELLE */
  var N=reg(0.80,0.32,1,0.62);
  x.fillStyle='#454e2e';x.fillRect(N.x,N.y,N.w,N.h);
  /* cowl band (front = high v) */
  x.fillStyle='#23241f';x.fillRect(N.x,N.y,N.w,N.h*0.30);
  mottle(x,N.x,N.y+N.h*0.3,N.w,N.h*0.7,['#3c4429','#505a33'],40,3,9,0.12);
  /* exhaust stain */
  x.globalAlpha=0.30;x.fillStyle='#191a14';
  x.fillRect(N.x+N.w*0.3,N.y+N.h*0.30,N.w*0.18,N.h*0.7);x.globalAlpha=1;
  panelLines(x,N.x,N.y,N.w,N.h,4,3,0.14);

  /* SWATCHES */
  x.fillStyle='#191a18';x.fillRect(0,1024-64,80,64);          /* dark  u≈.02 v≈.03 */
  x.fillStyle='#4d5736';x.fillRect(82,1024-64,80,64);         /* olive u≈.10 */
  x.fillStyle='#7a8082';x.fillRect(164,1024-64,80,64);        /* gray  u≈.18 */
  x.fillStyle='#caa636';x.fillRect(246,1024-64,80,64);        /* yellow u≈.26 */

  var tex=new THREE.CanvasTexture(c);
  tex.encoding=THREE.sRGBEncoding;
  tex.anisotropy=4;
  V2._b24Atlas=tex;
  return tex;
};

V2.airframeMat=function(){
  if(V2._airframeMat)return V2._airframeMat;
  V2._airframeMat=new THREE.MeshStandardMaterial({
    map:V2.b24Atlas(),roughness:0.6,metalness:0.22
  });
  return V2._airframeMat;
};
V2.glassMat=function(){
  if(V2._glassMat)return V2._glassMat;
  V2._glassMat=new THREE.MeshStandardMaterial({
    color:0x9fc8ea,roughness:0.12,metalness:0.85,
    transparent:true,opacity:0.45
  });
  return V2._glassMat;
};
V2.darkMat=function(){
  if(V2._darkMat)return V2._darkMat;
  V2._darkMat=new THREE.MeshStandardMaterial({
    color:0x1b1c1a,roughness:0.5,metalness:0.4
  });
  return V2._darkMat;
};
V2.blurMat=function(){
  if(V2._blurMat)return V2._blurMat;
  V2._blurMat=new THREE.MeshBasicMaterial({
    color:0xb9bdc4,transparent:true,opacity:0.10,
    side:THREE.DoubleSide,depthWrite:false
  });
  return V2._blurMat;
};

/* prop assembly: outer aligner (y→+x) wrapping inner spinner that the
   animation loop rotates via userData.isProp */
function makeProp(scale,blades){
  var wrap=new THREE.Group();
  wrap.rotation.z=-Math.PI/2;
  var spin=new THREE.Group();
  spin.userData={isProp:true,phase:Math.random()*6};
  /* hub */
  var hub=new THREE.Mesh(
    xformGeo(new THREE.ConeGeometry(0.30*scale,0.85*scale,10),0,0.35*scale,0),
    V2.darkMat());
  spin.add(hub);
  /* blades */
  var bladeGeo=xformGeo(new THREE.BoxGeometry(0.17*scale,0.05,2.65*scale),
    0,0,1.5*scale, 0,0,0);
  for(var i=0;i<(blades||3);i++){
    var bl=new THREE.Mesh(bladeGeo,V2.darkMat());
    bl.rotation.y=i*2*Math.PI/(blades||3);
    spin.add(bl);
  }
  var disc=new THREE.Mesh(
    xformGeo(new THREE.CircleGeometry(2.65*scale,24),0,0.05,0,-Math.PI/2,0,0),
    V2.blurMat());
  spin.add(disc);
  wrap.add(spin);
  return wrap;
}

/* ════════════════════ B-24 LIBERATOR ════════════════════ */
KM._buildB24=function(){
  var g=new THREE.Group();
  var air=[],glass=[],dark=[];

  /* Fuselage — smooth lathe, oval section (deep B-24 box-with-radius) */
  var prof=[],NP=22;
  for(var i=0;i<=NP;i++){
    var t=i/NP,xx=-17+t*28.5,r;
    if(t<0.06)r=0.35+t*14;                       /* tail cone */
    else if(t<0.18)r=1.19+(t-0.06)*6.4;
    else if(t<0.70)r=1.96+Math.sin((t-0.18)/0.52*Math.PI)*0.34;
    else if(t<0.90)r=1.96-(t-0.70)*2.6;
    else r=1.44-(t-0.90)*10.5;
    prof.push(new THREE.Vector2(Math.max(0.18,r),xx));
  }
  var fuse=new THREE.LatheGeometry(prof,26);
  xformGeo(fuse,0,0,0, 0,0,-Math.PI/2);   /* axis +x */
  xformGeo(fuse,0,0.25,0, 0,0,0, 1,1.18,0.92); /* oval section */
  fuse.computeVertexNormals();
  remapUV(fuse,0,0.64,1,1);
  air.push(fuse);

  /* Davis wing — high aspect, mounted high */
  var wingR=loftPanel({span:17,c0:5.3,c1:2.2,t0:0.13,t1:0.10,sweep:1.6,dihedral:1.5,segs:6});
  remapUV(wingR,0,0.32,0.48,0.62);
  xformGeo(wingR,0.8,2.05,0);
  var wingL=loftPanel({span:17,c0:5.3,c1:2.2,t0:0.13,t1:0.10,sweep:1.6,dihedral:1.5,segs:6,mirror:true});
  remapUV(wingL,0,0.32,0.48,0.62);
  xformGeo(wingL,0.8,2.05,0);
  air.push(wingR,wingL);

  /* Horizontal stabilizer */
  var hsR=loftPanel({span:7.2,c0:3.2,c1:1.9,t0:0.10,t1:0.08,sweep:0.9,dihedral:0.15,segs:3});
  remapUV(hsR,0.52,0.32,0.78,0.62);
  xformGeo(hsR,-13.4,0.8,0);
  var hsL=loftPanel({span:7.2,c0:3.2,c1:1.9,t0:0.10,t1:0.08,sweep:0.9,dihedral:0.15,segs:3,mirror:true});
  remapUV(hsL,0.52,0.32,0.78,0.62);
  xformGeo(hsL,-13.4,0.8,0);
  air.push(hsR,hsL);

  /* Twin oval fins */
  [-5.9,5.9].forEach(function(z){
    var shape=new THREE.Shape();
    shape.absellipse(0,0,1.95,2.95,0,Math.PI*2);
    var fin=new THREE.ExtrudeGeometry(shape,{depth:0.22,bevelEnabled:false});
    planarUV(fin,0.52,0.32,0.78,0.62,'xy');
    xformGeo(fin,-14.1,2.2,z-0.11, z>0?0.10:-0.10,0,0);
    air.push(fin);
  });

  /* Engine nacelles + cowls */
  [-12,-6,6,12].forEach(function(z){
    var dySpan=1.5*Math.abs(z)/17; /* follow dihedral */
    var ny=1.15+dySpan;
    var nac=new THREE.CylinderGeometry(0.78,1.06,5.6,14);
    xformGeo(nac,0,0,0, 0,0,-Math.PI/2); /* axis +x, front=+x */
    remapUV(nac,0.80,0.32,1.0,0.62);
    xformGeo(nac,2.6,ny,z);
    air.push(nac);
    var lip=new THREE.TorusGeometry(0.97,0.13,8,18);
    solidUV(lip,0.02,0.03);
    xformGeo(lip,5.38,ny,z, 0,Math.PI/2,0);
    dark.push(lip);
    var face=new THREE.CircleGeometry(0.95,16);
    solidUV(face,0.02,0.03);
    xformGeo(face,5.40,ny,z, 0,Math.PI/2,0);
    dark.push(face);
    /* prop */
    var prop=makeProp(1.0,3);
    prop.position.set(5.62,ny,z);
    g.add(prop);
  });

  /* Glazing & turrets */
  function sph(r,px,py,pz,sx,sy,sz,thetaLen){
    var s=new THREE.SphereGeometry(r,14,10,0,Math.PI*2,0,thetaLen||Math.PI);
    xformGeo(s,px,py,pz,0,0,0,sx||1,sy||1,sz||1);
    s.computeVertexNormals();
    return s;
  }
  glass.push(sph(0.92,10.6,0.45,0));                 /* Emerson nose turret */
  glass.push(sph(1.05,9.6,-0.5,0,1.25,0.8,0.95));    /* bombardier glazing */
  glass.push(sph(0.95,7.6,1.95,0,1.7,0.78,1.12));    /* cockpit canopy */
  glass.push(sph(0.95,4.9,2.55,0,1,0.85,1));         /* Martin top turret */
  glass.push(sph(0.86,-2.0,-2.3,0));                 /* Sperry ball */
  glass.push(sph(0.82,-16.3,0.7,0,1.1,1,1));         /* tail turret */
  glass.push(sph(0.42,8.7,2.25,0));                  /* astrodome */

  /* Guns + details (dark) */
  function barrel(len,px,py,pz,rx,ry,rz){
    var b=new THREE.CylinderGeometry(0.06,0.075,len,6);
    solidUV(b,0.02,0.03);
    xformGeo(b,0,len/2,0);
    xformGeo(b,px,py,pz,rx||0,ry||0,rz||0);
    return b;
  }
  /* nose twin */
  dark.push(barrel(1.7,11.3,0.5,-0.22, 0,0,-Math.PI/2));
  dark.push(barrel(1.7,11.3,0.5, 0.22, 0,0,-Math.PI/2));
  /* top twin angled up-aft */
  dark.push(barrel(1.6,4.5,3.2,-0.2, 0,0,2.4));
  dark.push(barrel(1.6,4.5,3.2, 0.2, 0,0,2.4));
  /* ball twin down */
  dark.push(barrel(1.2,-2.0,-3.1,-0.16, 0,0,Math.PI));
  dark.push(barrel(1.2,-2.0,-3.1, 0.16, 0,0,Math.PI));
  /* tail twin aft */
  dark.push(barrel(1.7,-17.2,0.75,-0.2, 0,0,Math.PI/2));
  dark.push(barrel(1.7,-17.2,0.75, 0.2, 0,0,Math.PI/2));
  /* waist guns */
  dark.push(barrel(1.5,-6,0.5,-2.4, Math.PI/2,0,0.35));
  dark.push(barrel(1.5,-6,0.5, 2.4, -Math.PI/2,0,-0.35));
  /* antenna mast */
  var mast=new THREE.CylinderGeometry(0.05,0.07,0.9,5);
  solidUV(mast,0.02,0.03);xformGeo(mast,6.4,2.7,0);
  dark.push(mast);
  /* pitot */
  dark.push(barrel(0.9,10.4,0.9,-1.3, 0,0,-Math.PI/2));

  var airMesh=new THREE.Mesh(mergeGeos(air),V2.airframeMat());
  var glassMesh=new THREE.Mesh(mergeGeos(glass),V2.glassMat());
  var darkMesh=new THREE.Mesh(mergeGeos(dark),V2.darkMat());
  g.add(airMesh);g.add(glassMesh);g.add(darkMesh);

  /* antenna wire */
  var wire=new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(6.4,3.15,0),new THREE.Vector3(-13.5,4.4,5.6)]),
    new THREE.LineBasicMaterial({color:0x222222,transparent:true,opacity:0.5}));
  g.add(wire);
  return g;
};

/* Crew positions — identical keys/offsets to v1 (camera block reads these) */
/* Eye points sit just outside/above the new glazing so the camera
   never ends up staring into the back of a turret. */
KM._crewPositions={
  pilot:    {offset:{x:7.9,y:2.3,z:-0.6}, look:{x:1,y:-0.08,z:0},  name:'Pilot'},
  copilot:  {offset:{x:7.9,y:2.3,z:0.6},  look:{x:1,y:-0.08,z:0},  name:'Copilot'},
  nav:      {offset:{x:9.3,y:0.2,z:0.9},  look:{x:0.55,y:-0.3,z:0.85},name:'Navigator'},
  bomb:     {offset:{x:10.6,y:-1.0,z:0},  look:{x:1,y:-0.45,z:0},  name:'Bombardier'},
  ttop:     {offset:{x:4.9,y:3.3,z:0},    look:{x:1,y:0.12,z:0},   name:'Top Turret Gunner'},
  ball:     {offset:{x:-2,y:-3.2,z:0},    look:{x:0.8,y:-0.55,z:0}, name:'Ball Turret Gunner'},
  tail:     {offset:{x:-17.6,y:0.9,z:0},  look:{x:-1,y:-0.05,z:0}, name:'Tail Gunner'},
  waistL:   {offset:{x:-6,y:0.45,z:-2.62},look:{x:0,y:-0.15,z:-1}, name:'Left Waist Gunner'},
  waistR:   {offset:{x:-6,y:0.45,z:2.62}, look:{x:0,y:-0.15,z:1},  name:'Right Waist Gunner'},
  radio:    {offset:{x:2.2,y:1.5,z:0},    look:{x:0.5,y:-0.25,z:-0.5},name:'Radio Operator'}
};

/* ════════════════════ FIGHTERS ════════════════════ */
/* shared fighter atlas: mottled Luftwaffe grays + bare-metal P-51 */
V2.fighterAtlas=function(){
  if(V2._ftrAtlas)return V2._ftrAtlas;
  var c=document.createElement('canvas');c.width=c.height=512;
  var x=c.getContext('2d');
  /* LW gray-violet mottle (top half) */
  x.fillStyle='#5b6066';x.fillRect(0,0,512,128);
  mottle(x,0,0,512,128,['#494e55','#6a6f74','#3f444b'],240,3,9,0.5);
  /* LW green mottle */
  x.fillStyle='#48523f';x.fillRect(0,128,512,128);
  mottle(x,0,128,512,128,['#3a4433','#59644a','#2f3a2b'],240,3,9,0.5);
  /* bare metal */
  x.fillStyle='#9aa1a8';x.fillRect(0,256,512,128);
  mottle(x,0,256,512,128,['#8b9298','#aab1b8','#7d848c'],160,4,14,0.35);
  panelLines(x,0,256,512,128,14,4,0.22);
  /* swatches: yellow band / black / spinner white */
  x.fillStyle='#d2a51f';x.fillRect(0,384,128,64);
  x.fillStyle='#141517';x.fillRect(128,384,128,64);
  x.fillStyle='#d8d8d4';x.fillRect(256,384,128,64);
  /* balkenkreuz on LW rows */
  function cross(cx,cy,s){
    x.fillStyle='#f0f0ec';x.fillRect(cx-s,cy-s*0.32,s*2,s*0.64);
    x.fillRect(cx-s*0.32,cy-s,s*0.64,s*2);
    x.fillStyle='#16181c';x.fillRect(cx-s*0.78,cy-s*0.2,s*1.56,s*0.4);
    x.fillRect(cx-s*0.2,cy-s*0.78,s*0.4,s*1.56);
  }
  cross(430,64,22);cross(430,192,22);
  /* US star on metal row */
  drawStar(x,430,320,22,true);
  var tex=new THREE.CanvasTexture(c);
  tex.encoding=THREE.sRGBEncoding;
  V2._ftrAtlas=tex;
  return tex;
};
V2.fighterMat=function(){
  if(V2._ftrMat)return V2._ftrMat;
  V2._ftrMat=new THREE.MeshStandardMaterial({
    map:V2.fighterAtlas(),roughness:0.5,metalness:0.45});
  return V2._ftrMat;
};

/* generic single-engine fighter builder */
function buildFighter(o){
  /* o: {len, wingSpan, wingC0, wingC1, noseR, row(v offset in atlas),
        spinnerLen, radial:boolean, bandV} */
  var g=new THREE.Group();
  var parts=[],dark=[],glass=[];
  var L=o.len,half=L/2;
  var prof=[],NP=16;
  for(var i=0;i<=NP;i++){
    var t=i/NP,xx=-half+t*L,r;
    if(t<0.08)r=0.18+t*5;
    else if(t<0.3)r=0.58+(t-0.08)*2.4;
    else if(t<0.55)r=o.noseR;
    else if(t<0.85)r=o.noseR-(t-0.55)*(o.radial?0.4:1.0);
    else r=Math.max(0.3,(o.radial?o.noseR-0.12:o.noseR*0.62)-(t-0.85)*1.4);
    prof.push(new THREE.Vector2(Math.max(0.12,Math.min(r,o.noseR)),xx));
  }
  var fuse=new THREE.LatheGeometry(prof,18);
  xformGeo(fuse,0,0,0, 0,0,-Math.PI/2);
  xformGeo(fuse,0,0,0, 0,0,0, 1,1.06,0.95);
  fuse.computeVertexNormals();
  remapUV(fuse,0,1-(o.row+1)*0.25,1,1-o.row*0.25);
  parts.push(fuse);

  var wR=loftPanel({span:o.wingSpan/2,c0:o.wingC0,c1:o.wingC1,t0:0.12,t1:0.09,sweep:0.5,dihedral:0.45,segs:4});
  remapUV(wR,0.55,1-(o.row+1)*0.25,1,1-o.row*0.25);
  xformGeo(wR,0.3,-0.25,0);
  var wL=loftPanel({span:o.wingSpan/2,c0:o.wingC0,c1:o.wingC1,t0:0.12,t1:0.09,sweep:0.5,dihedral:0.45,segs:4,mirror:true});
  remapUV(wL,0.55,1-(o.row+1)*0.25,1,1-o.row*0.25);
  xformGeo(wL,0.3,-0.25,0);
  parts.push(wR,wL);

  var hsR=loftPanel({span:2.6,c0:1.5,c1:0.9,t0:0.09,t1:0.07,sweep:0.3,dihedral:0,segs:2});
  remapUV(hsR,0,1-(o.row+1)*0.25,0.4,1-o.row*0.25);
  xformGeo(hsR,-half+0.6,0.25,0);
  var hsL=loftPanel({span:2.6,c0:1.5,c1:0.9,t0:0.09,t1:0.07,sweep:0.3,dihedral:0,segs:2,mirror:true});
  remapUV(hsL,0,1-(o.row+1)*0.25,0.4,1-o.row*0.25);
  xformGeo(hsL,-half+0.6,0.25,0);
  parts.push(hsR,hsL);

  var finShape=new THREE.Shape();
  finShape.moveTo(0,0);finShape.lineTo(1.5,0.25);finShape.lineTo(1.7,2.1);
  finShape.lineTo(0.7,2.3);finShape.lineTo(-0.5,0.6);finShape.closePath();
  var fin=new THREE.ExtrudeGeometry(finShape,{depth:0.14,bevelEnabled:false});
  planarUV(fin,0,1-(o.row+1)*0.25,0.4,1-o.row*0.25,'xy');
  xformGeo(fin,-half+0.1,0.4,-0.07);
  parts.push(fin);

  if(o.bandV!==undefined){
    var band=new THREE.CylinderGeometry(o.noseR+0.04,o.noseR+0.04,0.5,14);
    solidUV(band,0.12,0.18); /* yellow swatch */
    xformGeo(band,0,0,0, 0,0,-Math.PI/2);
    xformGeo(band,half*0.62,0.02,0);
    parts.push(band);
  }

  /* canopy */
  var can=new THREE.SphereGeometry(0.62,12,8,0,Math.PI*2,0,Math.PI*0.55);
  xformGeo(can,o.canX||0.6,o.noseR*0.95,0, 0,0,0, 1.7,0.9,0.95);
  can.computeVertexNormals();
  glass.push(can);

  /* spinner */
  var spnr=new THREE.ConeGeometry(o.radial?0.32:0.42,o.spinnerLen,10);
  solidUV(spnr,o.radial?0.27:0.52,0.18);
  xformGeo(spnr,0,o.spinnerLen/2,0);
  xformGeo(spnr,half+0.05,0,0, 0,0,-Math.PI/2);
  dark.push(spnr);

  var mainMesh=new THREE.Mesh(mergeGeos(parts),V2.fighterMat());
  g.add(mainMesh);
  if(glass.length)g.add(new THREE.Mesh(mergeGeos(glass),V2.glassMat()));
  if(dark.length)g.add(new THREE.Mesh(mergeGeos(dark),V2.darkMat()));
  var prop=makeProp(0.72,o.radial?3:4);
  prop.position.set(half+0.35,0,0);
  g.add(prop);
  return g;
}

KM._buildFw190=function(){
  return buildFighter({len:16,wingSpan:14.5,wingC0:3.1,wingC1:1.5,
    noseR:1.18,row:0,spinnerLen:0.9,radial:true,bandV:1,canX:0.4});
};
KM._buildBf109=function(){
  return buildFighter({len:14.5,wingSpan:12.5,wingC0:2.6,wingC1:1.2,
    noseR:0.92,row:1,spinnerLen:1.5,radial:false,canX:0.6});
};
KM._buildP51=function(){
  var g=buildFighter({len:14.5,wingSpan:14.5,wingC0:2.9,wingC1:1.3,
    noseR:0.88,row:2,spinnerLen:1.3,radial:false,canX:0.2});
  /* belly scoop */
  var scoop=new THREE.Mesh(
    xformGeo(solidUV(new THREE.CylinderGeometry(0.45,0.55,2.4,10),0.6,0.18),
      1.2,-0.85,0, 0,0,-Math.PI/2, 1,0.8,1),
    V2.fighterMat());
  g.add(scoop);
  return g;
};

console.log('KM v2: aircraft factory loaded');
/* ───────────── ACCURATE COMBAT BOX + CRASH SITES ─────────────
   Formation placement rebuilt from the Formation page's own dataset
   (grid positions per squadron: Lead element, High Right, Low Left,
   Slot). Replaces KM._buildFormation wholesale while preserving every
   interface the battle/camera blocks use. */

/* ═══ AUTHORITATIVE ROSTER — built from the site's Formation page ═══
   The 35 ships that flew. fate: r=shot down Germany, p=crash-landed
   allied territory, b=emergency landing England, g=returned to base.
   ft = seconds into the battle the ship was hit (702nd Low Left was
   slaughtered first; long-range stragglers fell late and far). */
V2.ROSTER=[
 /* 700th — Lead Squadron */
 {p:'Chilton', sq:'700th',rel:1, fate:'r',ft:70, serial:'42-51541',type:'B-24J',chutes:4},
 {p:'Uebelhoer',sq:'700th',rel:2, fate:'g',serial:'42-51547',type:'B-24J-5'},
 {p:'Hunter',  sq:'700th',rel:3, fate:'p',ft:110,type:'B-24H'},
 {p:'French',  sq:'700th',rel:4, fate:'p',ft:145,serial:'42-50784',type:'B-24J'},
 {p:'Bruce',   sq:'700th',rel:5, fate:'r',ft:84, serial:'42-95128',type:'B-24H',nick:'Bonnie Vee',chutes:2},
 {p:'Pearson', sq:'700th',rel:7, fate:'r',ft:112,serial:'44-10497',type:'B-24J',chutes:5},
 {p:'Carrow',  sq:'700th',rel:9, fate:'r',ft:140,serial:'42-110022',type:'B-24J',nick:'Patches',chutes:4},
 {p:'Heitz',   sq:'700th',rel:10,fate:'p',ft:175,serial:'42-95210',type:'B-24H',nick:'Uncle'},
 {p:'Hautman', sq:'700th',rel:11,fate:'r',ft:170,serial:'42-109789',nick:'Mairzy Doats',chutes:5},
 {p:'Hansen',  sq:'700th',rel:12,fate:'r',ft:195,chutes:5},
 /* 701st — High-high Right */
 {p:'Smith',   sq:'701st',rel:1, fate:'g',serial:'42-50710',type:'B-24J',nick:'Maria Lupine'},
 {p:'Walther', sq:'701st',rel:2, fate:'r',ft:96,type:'B-24J',chutes:5},
 {p:'Dewey',   sq:'701st',rel:3, fate:'b',ft:130,serial:'42-50855',type:'B-24J'},
 {p:'Golden',  sq:'701st',rel:7, fate:'r',ft:128,serial:'42-94863',type:'B-24H',nick:'Ole Baldy',chutes:6},
 {p:'Swofford',sq:'701st',rel:9, fate:'g',type:'B-24H'},
 {p:'Reynolds',sq:'701st',rel:10,fate:'r',ft:188,type:'B-24J',chutes:5},
 {p:'Bruland', sq:'701st',rel:12,fate:'r',ft:210,chutes:6},
 /* 702nd — High Right, 9 of 10 lost */
 {p:'Miner',   sq:'702nd',rel:1, fate:'r',ft:52, serial:'42-50961',type:'B-24J',chutes:7},
 {p:'Sollien', sq:'702nd',rel:2, fate:'r',ft:64, type:'B-24H',chutes:5},
 {p:'Jones',   sq:'702nd',rel:3, fate:'r',ft:75, serial:'41-29542',type:'B-24H',chutes:5},
 {p:'Baynham', sq:'702nd',rel:4, fate:'r',ft:88, serial:'42-50383',type:'B-24H',nick:'King Kong',chutes:5},
 {p:'Brent',   sq:'702nd',rel:5, fate:'r',ft:101,type:'B-24H',nick:'Eileen',chutes:4},
 {p:'Schaen',  sq:'702nd',rel:7, fate:'r',ft:118,serial:'44-10511',type:'B-24J',chutes:5},
 {p:'Potts',   sq:'702nd',rel:9, fate:'r',ft:132,chutes:5},
 {p:'Donald',  sq:'702nd',rel:10,fate:'r',ft:149,chutes:5},
 {p:'Warman',  sq:'702nd',rel:11,fate:'r',ft:166,chutes:4},
 {p:'Krivik',  sq:'702nd',rel:12,fate:'b',ft:190,type:'B-24J',nick:'Percy'},
 /* 703rd — Low Left / slot */
 {p:'Isom',    sq:'703rd',rel:1, fate:'g',serial:'42-50811',type:'B-24J',nick:'Patty Girl'},
 {p:'Johnson', sq:'703rd',rel:2, fate:'r',ft:60,chutes:5},
 {p:'Mercer',  sq:'703rd',rel:3, fate:'b',ft:160},
 {p:'Bolin',   sq:'703rd',rel:4, fate:'r',ft:92,chutes:4},
 {p:'Elder',   sq:'703rd',rel:7, fate:'r',ft:124,chutes:5},
 {p:'Seeds',   sq:'703rd',rel:9, fate:'r',ft:152,chutes:5},
 {p:'Mowat',   sq:'703rd',rel:10,fate:'r',ft:184,chutes:5},
 {p:'Fromm',   sq:'703rd',rel:11,fate:'r',ft:215,chutes:5}
];
var FATE_TYPE={r:'shot_down',p:'exit_allied',b:'exit_west',g:'rtb'};
/* Archive Formations025.pdf, printed page 24: squadron beneath each
   aircraft is not always the box heading. Keep ownership separate from
   placement; never regroup a borrowed aircraft into the wrong box. */
var AIRCRAFT_SQUADRON_OVERRIDES={Chilton:'703rd',Heitz:'703rd',Hautman:'703rd',Mercer:'700th',Elder:'700th',Seeds:'700th'};
/* relative position → offset within the squadron box.
   x: along-track (negative = trailing), y: stagger, z: lateral.
   Spacing widened so 34-unit wingspans don't overlap. */
var REL_OFFS={
  1:[0,0,0],        2:[-13,-1.5,18],  3:[-13,1.5,-18],
  4:[-39,9,36],     5:[-52,11,46],
  7:[-39,-9,-36],   9:[-52,-11,-46],
  10:[-26,-4,0],    11:[-39,-3,18],   12:[-39,-5,-18]
};
/* squadron boxes in trail (700 lead, 702 low-left, 701 high-right,
   703 slot/tail) — matches the head-on stagger diagram */
/* Cruel Sky (Dewez) p.44-45: 700th lead; 702nd high-RIGHT (+100ft);
   701st high-high-RIGHT (right of 702nd, +100ft more); 703rd low-LEFT
   (-100ft).  +z = right of the line of flight, +y = higher. */
var SQ_BOX={
  '700th':[0,0,0],          /* lead */
  '702nd':[-55, 14, 100],   /* high-right */
  '701st':[-110, 28, 190],  /* high-high-right (outboard of, above 702nd) */
  '703rd':[-55,-14,-100]    /* low-left */
};

KM._buildFormation=function(){
  var scene=KM._s,buildB24=KM._buildB24;
  if(!scene||!buildB24){console.error('KM v2: missing scene or builder');return;}

  /* Replace the embedded roster wholesale with the Formation page's. */
  var planes={};
  V2.ROSTER.forEach(function(r,i){
    planes[i+1]={id:i+1,pilot:r.p,sq:r.sq,formationSq:r.sq,aircraftSq:AIRCRAFT_SQUADRON_OVERRIDES[r.p]||r.sq,rel:r.rel,
      serial:r.serial||'',nick:r.nick||'',acType:r.type||'B-24',
      fate:r.fate,fateTime:r.ft!=null?r.ft:null,
      fateType:r.fate==='r'?'shot_down':(r.fate==='g'?'survived':'damaged'),
      behavior:FATE_TYPE[r.fate],chuteCount:r.chutes||0};
  });
  KM._planes=planes;
  var sqIndex={'700th':[],'701st':[],'702nd':[],'703rd':[]};
  Object.keys(planes).forEach(function(id){sqIndex[planes[id].sq].push(planes[id]);});
  KM._squadrons=sqIndex;

  var formPlanes=[];KM._fp=formPlanes;
  function offsetFor(pd){
    var sqo=SQ_BOX[pd.sq]||[0,0,0];
    var ro=REL_OFFS[pd.rel]||[0,0,0];
    return {x:sqo[0]+ro[0],y:sqo[1]+ro[1],z:sqo[2]+ro[2]};
  }

  /* lead ship — Chilton, #1 of the 700th (same size as every other ship).
     NOTE: this initial scale is overwritten on the very first animation
     frame by placePlane's KM._ps-forcing line, so 0.46 here is cosmetic
     only — the live render scale is whatever KM._ps resolves to (0.09
     by default). Escort/fighter scale below is intentionally based on
     KM._ps for that reason — see the verified ~1/3 wingspan ratio noted
     there. */
  var lead=(KM._buildB24Hi||buildB24)();lead.scale.set(0.46,0.46,0.46);
  scene.add(lead);KM._b24=lead;
  lead.userData={id:1,squadron:'700th',alive:true,deathT:null,
    planeData:planes[1],smokeTrail:null,basePhase:0};

  /* the other 34 */
  for(var id=2;id<=35;id++){
    var pd=planes[id];
    var off=offsetFor(pd);
    var clone=buildB24();
    clone.scale.set(0.46,0.46,0.46);
    clone.userData={
      id:id,squadron:pd.sq,
      offset:off,
      basePhase:Math.random()*Math.PI*2,
      alive:true,deathT:null,planeData:pd,
      smokeTrail:null,deathState:null
    };
    scene.add(clone);
    formPlanes.push(clone);
  }

  /* plane selector dropdown */
  var sel=document.getElementById('cp-plane');
  if(sel){
    sel.innerHTML='';
    ['700th','701st','702nd','703rd'].forEach(function(sq){
      var og=document.createElement('optgroup');
      og.label=sq+' BS'+(sq==='700th'?' (Lead)':sq==='701st'?' (High-high Right)':sq==='702nd'?' (High Right)':' (Low Left)');
      sqIndex[sq].forEach(function(p){
        var opt=document.createElement('option');
        opt.value=p.id;
        opt.textContent=p.pilot+(p.nick?' — '+p.nick:'');
        og.appendChild(opt);
      });
      sel.appendChild(og);
    });
  }

  /* P-51 escorts — true relative size (~44% of a B-24) */
  var escorts=[];KM._escorts=escorts;
  if(KM._buildP51){
    for(var i=0;i<8;i++){
      var p51=KM._buildP51();
      p51.scale.setScalar((KM._ps||0.09)*0.79);
      p51.userData={escortIdx:i,phase:i*Math.PI/4,alive:true,departed:false};
      scene.add(p51);escorts.push(p51);
    }
  }

  /* fighter waves — Sturmgruppe company-front attacks from astern */
  V2.WAVES=[
    {type:'fw190',count:14,t:40},
    {type:'bf109',count:8, t:70},
    {type:'fw190',count:12,t:150},
    {type:'bf109',count:6, t:215}
  ];
  KM._fighters=[];
  V2.WAVES.forEach(function(wave,wi){
    var models=[];
    var builder=wave.type==='fw190'?KM._buildFw190:KM._buildBf109;
    for(var f=0;f<wave.count;f++){
      var fm=builder();
      fm.scale.setScalar((KM._ps||0.09)*0.76);
      fm.visible=false;
      fm.userData={waveIdx:wi,fighterIdx:f,active:false,modelType:wave.type};
      scene.add(fm);models.push(fm);
    }
    wave.models=models;
  });
  KM._fighterWaves=V2.WAVES;

  /* smoke / fire / flak systems (same data contract as v1, nicer materials) */
  var soft=V2.softTex();
  function pool(count,mat){
    var geo=new THREE.BufferGeometry();
    var pos=new Float32Array(count*3);
    for(var p=0;p<count;p++){pos[p*3]=-9999;pos[p*3+1]=-9999;pos[p*3+2]=-9999;}
    geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    var pts=new THREE.Points(geo,mat);
    pts.frustumCulled=false;
    scene.add(pts);
    return {geo:geo,pos:pos};
  }
  var smoke=pool(2000,new THREE.PointsMaterial({map:soft,color:0x3a3b40,size:9,
    transparent:true,opacity:0.5,depthWrite:false}));
  KM._smoke={geo:smoke.geo,pos:smoke.pos,alpha:new Float32Array(2000),
    life:new Float32Array(2000),count:2000,nextIdx:0};
  var lossMaterial=new THREE.PointsMaterial({map:soft,color:0x35373a,size:1.2,
    transparent:true,opacity:.40,depthWrite:false});
  lossMaterial.onBeforeCompile=function(shader){
    shader.vertexShader='attribute vec2 plume; varying float plumeOpacity;\n'+shader.vertexShader
      .replace('gl_PointSize = size;', 'gl_PointSize = size * plume.x; plumeOpacity = plume.y;');
    shader.fragmentShader='varying float plumeOpacity;\n'+shader.fragmentShader
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );','vec4 diffuseColor = vec4( diffuse, opacity * plumeOpacity );');
  };
  var lossSmoke=pool(1100,lossMaterial);
  var plume=new Float32Array(2200);
  lossSmoke.geo.setAttribute('plume',new THREE.BufferAttribute(plume,2));
  KM._lossSmoke={geo:lossSmoke.geo,pos:lossSmoke.pos,plume:plume,count:1100,nextIdx:0};
  var fire=pool(500,new THREE.PointsMaterial({map:soft,color:0xff7a33,size:5,
    transparent:true,opacity:0.65,depthWrite:false,blending:THREE.AdditiveBlending}));
  KM._fire={geo:fire.geo,pos:fire.pos,count:500,nextIdx:0};
  var flakCount=120;
  var flakGeo=new THREE.BufferGeometry();KM._flakGeo=flakGeo;
  var flakPos=new Float32Array(flakCount*3);
  for(var fl=0;fl<flakCount;fl++){
    flakPos[fl*3]=380+Math.random()*280;
    flakPos[fl*3+1]=80+Math.random()*100;
    flakPos[fl*3+2]=-120-Math.random()*180;
  }
  flakGeo.setAttribute('position',new THREE.BufferAttribute(flakPos,3));
  KM._flakCount=flakCount;
  var flakMat=new THREE.PointsMaterial({map:soft,color:0x4a4438,size:8,
    transparent:true,opacity:0.35,depthWrite:false});
  var flakPts=new THREE.Points(flakGeo,flakMat);
  flakPts.frustumCulled=false;
  scene.add(flakPts);KM._flakMat=flakMat;

  /* waypoint markers — the story points of the actual track */
  var pts=KM._pts;
  if(pts&&pts.length>=12){
    [{p:pts[0],c:0xFFC401},          /* Tibenham        */
     {p:pts[3],c:0xFFC401},          /* Dutch coast     */
     {p:pts[7],c:0xcc4444},          /* the IP — navigation error */
     {p:pts[9],c:0xcc4444},          /* Göttingen — bombs away in error */
     {p:pts[15],c:0xcc4444}]         /* Sturmgruppen strike near Eisenach */
    .forEach(function(wp){
      var ws=new THREE.Mesh(new THREE.SphereGeometry(2.2,12,12),
        new THREE.MeshBasicMaterial({color:wp.c,transparent:true,opacity:0.85}));
      ws.position.copy(wp.p);scene.add(ws);
      var ring=new THREE.Mesh(new THREE.RingGeometry(3.5,4.5,28),
        new THREE.MeshBasicMaterial({color:wp.c,transparent:true,opacity:0.18,side:THREE.DoubleSide}));
      ring.position.copy(wp.p);ring.position.y+=1;ring.rotation.x=-Math.PI/2;
      ring.userData={phase:Math.random()*Math.PI*2};scene.add(ring);
    });
  }

  V2.addCrashSites(scene,true);

  console.log('KM v2: accurate combat box built —',formPlanes.length+1,'B-24s');
};

/* ───────────────────── CRASH SITES ─────────────────────
   Documented crash/landing locations from the Formation page data,
   geocoded and projected onto the real terrain. */
/* Positions digitized from the Giesler "445th Germany Crash Sites"
   map: 21 sites in a 16-mile radius around Ulfen, plus the long-range
   ships (Miner 40 mi, Bruland 77 mi, Hautman/Reynolds 137 mi SW). */
V2.CRASH_SITES=[
  {n:'Jones',loc:'NE of Ulfen',lon:10.234,lat:51.196,f:'r'},
  {n:'Fromm',loc:'Hessisch Lichtenau',lon:9.736,lat:51.172,f:'r'},
  {n:'Johnson',loc:'Breitau',lon:9.867,lat:51.146,f:'r'},
  {n:'Elder',loc:'Lindenau',lon:9.842,lat:51.074,f:'r'},
  {n:'Golden',loc:'Cornberg',lon:9.684,lat:51.045,f:'r'},
  {n:'Baynham',loc:'W of Ulfen',lon:9.676,lat:51.013,f:'r'},
  {n:'Brent',loc:'Ulfen',lon:9.949,lat:51.013,f:'r'},
  {n:'Donald',loc:'Nesselröden',lon:10.071,lat:51.051,f:'r'},
  {n:'Potts',loc:'Archfeld',lon:10.202,lat:51.043,f:'r'},
  {n:'Warman',loc:'Gerstungen',lon:9.891,lat:50.983,f:'r'},
  {n:'Sollien',loc:'Herleshausen',lon:10.043,lat:50.990,f:'r'},
  {n:'Schaen',loc:'Gerstungen',lon:9.937,lat:50.960,f:'r'},
  {n:'Walther',loc:'Lauchroden',lon:10.055,lat:50.959,f:'r'},
  {n:'Pearson',loc:'W of Eisenach',lon:10.194,lat:50.963,f:'r'},
  {n:'Bolin',loc:'Approx. 1.8 km SE of Krauthausen',lon:10.2882,lat:51.0058,f:'r',coordinateStatus:'Approximate offset from modern town reference, not surveyed wreck position',source:'Hassenpflug crash compilation page 1'},
  {n:'Carrow',loc:'SW of Ulfen',lon:9.736,lat:50.943,f:'r'},
  {n:'Bruce',loc:'S of Ulfen',lon:9.918,lat:50.935,f:'r'},
  {n:'Seeds',loc:'Lauchroden',lon:10.035,lat:50.939,f:'r'},
  {n:'Hansen',loc:'S of Ulfen',lon:9.842,lat:50.923,f:'r'},
  {n:'Mowat',loc:'Hönebach',lon:9.802,lat:50.879,f:'r'},
  {n:'Chilton',loc:'Friedlos',lon:9.757,lat:50.826,f:'r'},
  {n:'Miner',loc:'40 mi SW — Grebenau',lon:9.50,lat:50.70,f:'r'},
  {n:'Bruland',loc:'77 mi SW',lon:8.77,lat:50.42,f:'r'},
  {n:'Hautman',loc:'Approx. 2.5 km SE of Bassenheim',lon:7.4866,lat:50.3438,f:'r',coordinateStatus:'Approximate offset from modern town reference, not surveyed wreck position',source:'Hassenpflug crash compilation page 1; Bassenheim reference Wikidata Q566930'},
  {n:'Reynolds',loc:'Approx. 2.5 km E of Polch',lon:7.3519,lat:50.3011,f:'r',coordinateStatus:'Approximate offset from modern town reference, not surveyed wreck position',source:'Hassenpflug crash compilation page 2'},
  {n:'French',loc:'Metz-Frescaty',lon:6.20,lat:49.07,f:'p'},
  {n:'Hunter',loc:'Lille',lon:3.06,lat:50.63,f:'p'},
  {n:'Heitz',loc:'Brussels',lon:4.35,lat:50.85,f:'p'},
  {n:'Dewey',loc:'Manston',lon:1.35,lat:51.35,f:'b'},
  {n:'Mercer',loc:'Manston',lon:1.37,lat:51.34,f:'b'},
  {n:'Krivik',loc:'outside Diss, near Tibenham',lon:1.109,lat:52.376,f:'b'}
];
V2.FATE_COLORS={r:0xe74c3c,p:0x8e44ad,b:0x2980b9,g:0x27ae60};

V2.addCrashSites=function(scene,subtle){
  var group=new THREE.Group();group.name='v2crash';
  var labelGroup=new THREE.Group();labelGroup.name='v2crashLabels';
  var soft=V2.softTex();
  var items={};
  V2.CRASH_SITES.forEach(function(cs){
    var xz=GEO.lonLatToXZ(cs.lon,cs.lat);
    var y=Math.max(1.5,(V2.demReady?V2.elevAt(xz[0],xz[1]):30)*ELEV_SCALE)+1.5;
    var col=V2.FATE_COLORS[cs.f]||0xe74c3c;
    var dot=new THREE.Mesh(new THREE.SphereGeometry(1.6,8,8),
      new THREE.MeshBasicMaterial({color:col}));
    dot.position.set(xz[0],y,xz[1]);group.add(dot);
    var halo=new THREE.Sprite(new THREE.SpriteMaterial({map:soft,color:col,
      transparent:true,opacity:subtle?0.22:0.4,depthWrite:false,
      blending:THREE.AdditiveBlending}));
    halo.position.set(xz[0],y+0.5,xz[1]);halo.scale.set(8,8,1);
    group.add(halo);
    /* label sprite (revealed in crash view / when the ship goes down) */
    var c=document.createElement('canvas');c.width=512;c.height=96;
    var g2=c.getContext('2d');
    g2.font='600 30px Oswald, Arial, sans-serif';
    g2.textAlign='center';g2.shadowColor='rgba(0,0,0,0.95)';g2.shadowBlur=10;
    g2.fillStyle='rgba(255,255,255,0.85)';
    g2.fillText(cs.n.toUpperCase(),256,38);
    g2.font='400 22px Montserrat, Arial, sans-serif';
    g2.fillStyle='rgba(255,255,255,0.55)';
    g2.fillText(cs.loc,256,72);
    var sp=new THREE.Sprite(new THREE.SpriteMaterial({
      map:new THREE.CanvasTexture(c),transparent:true,opacity:0,depthWrite:false}));
    sp.position.set(xz[0],y+9,xz[1]);sp.scale.set(34,6.4,1);
    labelGroup.add(sp);
    items[cs.n]={dot:dot,halo:halo,label:sp,pos:new THREE.Vector3(xz[0],y,xz[1]),f:cs.f,baseHaloOpacity:subtle?0.22:0.4};
  });
  scene.add(group);scene.add(labelGroup);
  V2._crashGroups=V2._crashGroups||[];
  V2._crashGroups.push({scene:scene,group:group,labels:labelGroup,items:items});
  return group;
};
V2.crashSiteFor=function(scene,pilot){
  var hit=null;
  (V2._crashGroups||[]).forEach(function(cg){
    if(cg.scene===scene&&cg.items[pilot])hit=cg.items[pilot];
  });
  return hit;
};
V2.revealCrash=function(scene,pilot){
  var it=V2.crashSiteFor(scene,pilot);
  if(!it)return;
  it.halo.material.opacity=0.55;
  it.label.material.opacity=0.85;
};
V2.resetCrashReveals=function(scene){
  (V2._crashGroups||[]).forEach(function(cg){
    if(cg.scene!==scene)return;
    Object.keys(cg.items).forEach(function(key){var it=cg.items[key];
      it.halo.material.opacity=it.baseHaloOpacity;
      it.label.material.opacity=0;
    });
  });
};
V2.setCrashLabels=function(scene,visible){
  (V2._crashGroups||[]).forEach(function(cg){
    if(cg.scene!==scene)return;
    cg.labels.children.forEach(function(sp){sp.material.opacity=visible?0.9:0;});
    cg.group.children.forEach(function(m){
      if(m.isSprite)m.material.opacity=visible?0.5:0.22;
    });
  });
};
/* ───────────────────── REAL AIRCRAFT MODELS ─────────────────────
   Licensed GLTF models, hosted on the site CDN:
   - "B-24 Liberator" by CreadorDeMu — CC-BY-4.0
   - "BF 109 - Messerschmitt" by GRIP420 — CC-BY-NC-4.0
   - "P-51 Mustang" by ACshibu — CC-BY-NC-4.0
   (Fw 190 remains procedural — no properly licensed model available.)
   Models load async; procedural builders fill in until ready, then
   every existing aircraft is swapped in place. */

V2.MODEL_URLS={
  /* The purpose-built olive-drab exterior is the formation model. The
     supplied 8 MB interior aircraft is fetched separately, and only for
     the ship whose crew station is open. Besides restoring the correct
     wartime skin, this avoids rendering 35 copies of the full interior. */
  b24lo:'https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2ae0629d4e48a4e049a072_km-b24-olive.glb',
  /* The prior BF 109 GLB contains a broken animation accessor and fails
     inside GLTFLoader. Keep the documented procedural 109 silhouette
     instead; it is complete, correctly oriented, and has a live prop. */
  /* "P-51 Mustang" by an.s055163 — CC-BY-4.0 (named prop + gear nodes) */
  p51:'https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2b19eff3a4c9950f5299e3_km-p51-v2.glb',
  /* "Fw190" by manilov.ap — CC-BY-4.0 (an original model at last) */
  fw190:'https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2b19ef0caf522b3019d402_km-fw190.glb'
};
V2.MODEL_CFG={
  b24lo:{len:33,rotY:Math.PI/2,centerX:-2.7,centerY:0.3,
    forceRotY:Math.PI/2,dropRe:/gear|wheel|tire/i},
  /* the 109's canopy frame outscores its fin in the top-vertex test,
     putting the "fin" forward of center — flip it */
  /* the NEW fighters have named nodes: real props spin, real landing
     gear is removed cleanly (no more parked airplanes in the sky) */
  bf109:{len:14.5,rotY:-Math.PI/2,centerX:-0.5,centerY:0,pitch:-0.03,
    dropRe:/gear|wheel/i},
  p51:{len:14.5,rotY:-Math.PI/2,centerX:-0.5,centerY:0,pitch:-0.03,
    dropRe:/gear|wheel/i},
  /* Cylinder18 is the prop at native Z +2.27; tail fin is Z -4.81.
     Native +Z nose maps to +X with POSITIVE ninety degrees. */
  fw190:{len:13.5,rotY:Math.PI/2,centerX:-0.5,centerY:0,pitch:-0.03,
    forceRotY:Math.PI/2,addProp:3},
  /* the consolidated B-24 with FULL MODELED COCKPIT — crew views only */
  b24detail:{len:33,rotY:Math.PI/2,centerX:-2.7,centerY:0.3,
    forceRotY:Math.PI/2,dropRe:/gear|wheel|tire/i,doubleSide:false}
};
V2.DETAIL_URL='b24j.glb'; /* bundled supplied asset: no extra CDN dependency */
/* lazy: only fetched the first time someone opens a crew view */
V2.loadDetailB24=function(){
  if(V2._detailLoading||V2.templates.b24detail)return;
  V2._detailLoading=true;
  if(!THREE.GLTFLoader)return;
  var loader=new THREE.GLTFLoader();
  var status=document.getElementById('km-interior-load');
  if(!status){
    status=document.createElement('div');status.id='km-interior-load';
    status.setAttribute('role','status');status.setAttribute('aria-live','polite');
    status.style.cssText='position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);z-index:35;padding:12px 18px;background:rgba(8,12,15,.92);color:#e8e5dc;border:1px solid #b69b48;font:12px Montserrat,sans-serif;pointer-events:none';
    document.getElementById('terrain-wrap').appendChild(status);
  }
  status.textContent='Loading supplied B-24 interior…';status.style.display='block';
  fetch(V2.DETAIL_URL).then(function(r){if(!r.ok)throw new Error('Interior asset HTTP '+r.status);return r.arrayBuffer();})
    .then(function(buf){
      loader.parse(buf,'',function(gltf){
        try{
          V2.prepareTemplate(gltf,'b24detail');
          status.style.display='none';
          if(V2.attachInterior&&KM._camState&&KM._camState.mode==='crew'){
            V2.attachInterior(); /* upgrade the open view in place */
          }
        }catch(e){V2._detailLoading=false;status.textContent='Interior could not be prepared. Select the station to retry.';console.error('KM v2: detail template',e);}
      },function(err){V2._detailLoading=false;status.textContent='Interior could not be decoded. Select the station to retry.';console.error('KM v2: detail parse',err);});
    }).catch(function(e){V2._detailLoading=false;status.textContent='Interior asset unavailable. Select the station to retry.';console.warn('KM v2: detail fetch failed',e);});
};
V2.templates={};
V2._pendingPlanes=[];

/* keep procedural builders as fallbacks */
var PROC={b24:KM._buildB24,bf109:KM._buildBf109,p51:KM._buildP51};
if(window.KasselHistoricalGeometry){
  PROC.bf109=function(){return window.KasselHistoricalGeometry.fighter(THREE);};
}

function isPropName(n){return /prop|blade|spinner|rotor|elica/i.test(n||'');}

V2.prepareTemplate=function(gltf,key){
  var cfg=V2.MODEL_CFG[key];
  var src=gltf.scene||gltf.scenes[0];
  src.updateMatrixWorld(true);
  /* Interior and exterior must share ONE airframe fit. Normalizing the
     filtered interior alone stretches its compartments and shifts every seat. */
  var airframeBounds=key==='b24detail'?new THREE.Box3().setFromObject(src):null;
  var byMat=new Map(),props=[],ballParts=[];
  var hasNamedExterior=false;
  if(key==='b24lo')src.traverse(function(n){
    if(n.name==='km-b24-exterior')hasNamedExterior=true;
  });
  src.traverse(function(o){
    if(!o.isMesh||!o.geometry)return;
    /* The supplied GLB contains two clean branches. Formation clones
       never duplicate the 100-object interior; crew view keeps both. */
    if(key==='b24lo'&&hasNamedExterior){
      var branch=o,external=false;
      while(branch){if(branch.name==='km-b24-exterior'){external=true;break;}branch=branch.parent;}
      if(!external)return;
    }
    /* Crew mode is the inverse swap required by the build spec: render
       only the supplied `interior` branch. Keeping the detailed model's
       exterior and making it double-sided put the camera behind the
       aircraft skin, which produced the giant black/white polygons that
       made every station look broken. */
    if(key==='b24detail'){
      var intBranch=o,inside=false;
      while(intBranch){if(intBranch.name==='interior'){inside=true;break;}intBranch=intBranch.parent;}
      if(!inside)return;
      /* These two supplied meshes are closed opaque shells. They are
         excellent exterior silhouettes, but from the gunner's eye they
         cover the entire frame. The station layer below recreates them
         as framed glazing while retaining the supplied seats, guns,
         yokes, mounts, ammunition and surrounding structure. */
      if(/^(nose-turret-armor-doors|ball-turret)$/i.test(o.name||''))return;
    }
    var prop=false,propRoot=null,drop=false,p=o,shown=true;
    while(p){
      if(isPropName(p.name)){prop=true;if(p!==src)propRoot=p;}
      if(cfg.dropRe&&cfg.dropRe.test(p.name||''))drop=true;
      if(p.visible===false)shown=false;
      p=p.parent;
    }
    if(!shown)return;
    if(drop)return; /* landing gear etc — gone for flight */
    var g=o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    if(!g.attributes.normal)g.computeVertexNormals();
    /* The B-24 asset contains mutually exclusive still / slow / blurred
       prop states. In flight only the blurred state is visible. */
    /* Replace the B-24's mutually exclusive animation-state meshes with
       one clean, visibly rotating in-flight prop assembly per engine. */
    if(prop&&key.indexOf('b24')===0)return;
    if(prop){props.push({geo:g,mat:o.material,name:(propRoot&&propRoot.name)||o.name,
      assembly:propRoot?propRoot.uuid:o.uuid,
      shaftDirection:new THREE.Vector3(0,0,1).transformDirection((propRoot||o).matrixWorld),
      anchor:propRoot&&!propRoot.isMesh?propRoot.getWorldPosition(new THREE.Vector3()):null});return;}
    /* The Sperry ball turret is kept as its own switchable part: by
       Kassel the 445th had pulled most ball turrets (see aircraft-damage-data.js).
       Native glTF frame, +Z nose; the well sits about 5.3 m aft. */
    if(key==='b24lo'){
      g.computeBoundingBox();
      var bc=g.boundingBox.getCenter(new THREE.Vector3()),bs=g.boundingBox.getSize(new THREE.Vector3());
      if(Math.abs(bc.x)<.6&&bc.z>-6.2&&bc.z<-4.5&&bc.y>-2.2&&bc.y<.6&&Math.max(bs.x,bs.y,bs.z)<1.7){ballParts.push({g:g,m:o.material});return;}
    }
    KasselAircraftMaterialGeometry.split(THREE,g,o.material).forEach(function(part){
      if(!byMat.has(part.material))byMat.set(part.material,[]);
      byMat.get(part.material).push(part.geometry);
    });
    if(Array.isArray(o.material))g.dispose();
  });

  /* ── auto-orientation, done right ──
     A fighter's WINGSPAN is longer than its fuselage, so bounding-box
     "long axis" detection picks the wings and flies the plane sideways.
     The reliable landmark is structural: the propeller sits at the
     nose, the tall tail fin at the rear — and both sit ON the fuselage
     centerline, far from origin along the fuselage axis and near zero
     along the wing axis. */
  var bbAll=new THREE.Box3();
  byMat.forEach(function(geos){geos.forEach(function(g2){
    g2.computeBoundingBox();bbAll.union(g2.boundingBox);
  });});
  var mark=null;     /* centroid of the landmark (prop or fin) */
  var markIsNose=false;
  if(props.length){
    var pc=new THREE.Vector3();
    props.forEach(function(pr){
      pr.geo.computeBoundingBox();
      pc.add(pr.geo.boundingBox.getCenter(new THREE.Vector3()));
    });
    pc.divideScalar(props.length);
    mark=pc;markIsNose=true;
  }else{
    /* tail fin = the topmost 12% of vertices */
    var yMax=bbAll.max.y,yMin=bbAll.min.y;
    var cut=yMax-(yMax-yMin)*0.12;
    var fx=0,fz=0,fn=0;
    byMat.forEach(function(geos){geos.forEach(function(g3){
      var pa=g3.attributes.position;
      for(var vi=0;vi<pa.count;vi++){
        if(pa.getY(vi)>=cut){fx+=pa.getX(vi);fz+=pa.getZ(vi);fn++;}
      }
    });});
    if(fn>0){mark=new THREE.Vector3(fx/fn,0,fz/fn);markIsNose=false;}
  }
  var _fuseZ=true,_noseSign=1;
  if(mark){
    var ctr=bbAll.getCenter(new THREE.Vector3());
    var mx=mark.x-ctr.x,mz=mark.z-ctr.z;
    var fuseZ=Math.abs(mz)>=Math.abs(mx);   /* fuselage runs along z? */
    var v=fuseZ?mz:mx;
    var noseSign=markIsNose?(v>=0?1:-1):(v>=0?-1:1);
    if(cfg.noseFlip)noseSign=-noseSign;
    _fuseZ=fuseZ;_noseSign=noseSign;
    var rotY=fuseZ?(noseSign<0?-Math.PI/2:Math.PI/2):(noseSign<0?Math.PI:0);
    if(cfg.forceRotY!==undefined)rotY=cfg.forceRotY;
    cfg=Object.assign({},cfg,{rotY:rotY});
  }
  /* amputate the parked-airplane parts: everything below the gear cut
     line, AND the static prop blades (a thin slab at the nose, sparing
     the spinner hub) — the spin disc replaces the blades in flight */
  if(cfg.cutBelow){
    var hAll=bbAll.max.y-bbAll.min.y;
    var yCut=bbAll.min.y+hAll*cfg.cutBelow;
    var lenAxis=_fuseZ?(bbAll.max.z-bbAll.min.z):(bbAll.max.x-bbAll.min.x);
    var noseCo=_fuseZ?(_noseSign>0?bbAll.max.z:bbAll.min.z)
                     :(_noseSign>0?bbAll.max.x:bbAll.min.x);
    var slab=lenAxis*0.085,hubR=lenAxis*0.045;
    var midY=(bbAll.max.y+bbAll.min.y)/2;
    function isBlade(ax,ay,az){
      var co=_fuseZ?az:ax,la=_fuseZ?ax:az;
      if(Math.abs(co-noseCo)>slab)return false;
      var rr=Math.sqrt(la*la+(ay-midY*0.3)*(ay-midY*0.3));
      return rr>hubR;
    }
    byMat.forEach(function(geos){
      for(var gi=0;gi<geos.length;gi++){
        var g0=geos[gi].index?geos[gi].toNonIndexed():geos[gi];
        var pa0=g0.attributes.position,keep=[];
        for(var t0=0;t0<pa0.count;t0+=3){
          var gear=pa0.getY(t0)<yCut&&pa0.getY(t0+1)<yCut&&pa0.getY(t0+2)<yCut;
          var blade=isBlade(pa0.getX(t0),pa0.getY(t0),pa0.getZ(t0))&&
                    isBlade(pa0.getX(t0+1),pa0.getY(t0+1),pa0.getZ(t0+1));
          if(!gear&&!blade)keep.push(t0);
        }
        var attrs=Object.keys(g0.attributes),g1=new THREE.BufferGeometry();
        attrs.forEach(function(an){
          var src0=g0.attributes[an],it=src0.itemSize;
          var arr=new Float32Array(keep.length*3*it);
          for(var k0=0;k0<keep.length;k0++)
            for(var vv=0;vv<3;vv++)
              for(var ii=0;ii<it;ii++)
                arr[(k0*3+vv)*it+ii]=src0.array[(keep[k0]+vv)*it+ii];
          g1.setAttribute(an,new THREE.BufferAttribute(arr,it));
        });
        geos[gi]=g1;
      }
    });
  }
  var inner=new THREE.Group();
  var isB24=key.indexOf('b24')===0;
  byMat.forEach(function(geos,mat){
    /* Never mutate a material shared by a separately loaded template. */
    mat=mat&&mat.clone?mat.clone():mat;
    if(mat&&mat.map)mat.map.encoding=THREE.sRGBEncoding;
    if(mat){
      /* interiors need both faces — the camera sits INSIDE the hull */
      mat.side=cfg.doubleSide?THREE.DoubleSide:THREE.FrontSide;
      if(cfg.doubleSide&&mat.transparent){
        mat.opacity=Math.min(mat.opacity||1,0.28); /* clear glazing */
        mat.depthWrite=false;
      }
      /* olive drab is baked into the texture now — just keep the
         finish matte like a wartime paint job */
      if(isB24&&!mat.transparent){
        if(mat.roughness!==undefined)mat.roughness=Math.max(mat.roughness,0.6);
        if(mat.metalness!==undefined)mat.metalness=Math.min(mat.metalness,0.35);
      }
    }
    var merged=geos.length===1?geos[0]:mergeGeos(geos);
    inner.add(new THREE.Mesh(merged,mat));
  });
  if(ballParts.length){
    var ballGroup=new THREE.Group(),ballMat=new Map();ballGroup.name='km-ball-turret-exterior';
    ballParts.forEach(function(b){KasselAircraftMaterialGeometry.split(THREE,b.g,b.m).forEach(function(part){
      if(!ballMat.has(part.material))ballMat.set(part.material,[]);ballMat.get(part.material).push(part.geometry);});});
    ballMat.forEach(function(geos,mat){
      mat=mat&&mat.clone?mat.clone():mat;if(mat&&mat.map)mat.map.encoding=THREE.sRGBEncoding;
      ballGroup.add(new THREE.Mesh(geos.length===1?geos[0]:mergeGeos(geos),mat));
    });
    inner.add(ballGroup);
  }
  /* prop pivots — preserved separately so they can spin */
  KasselPropellerAssembly.build(THREE,props).forEach(function(pivot){inner.add(pivot);});
  /* orient + normalize scale (slight nose-down flying attitude for
     fighters — they're not sitting on a runway up here) */
  var orient=new THREE.Group();
  orient.rotation.y=cfg.rotY;
  if(cfg.pitch)orient.rotation.z=cfg.pitch;
  orient.add(inner);
  var holder=new THREE.Group();
  holder.add(orient);
  holder.updateMatrixWorld(true);
  var bb=new THREE.Box3().setFromObject(holder);
  if(airframeBounds)bb.copy(airframeBounds.clone().applyMatrix4(orient.matrix));
  var size=bb.getSize(new THREE.Vector3());
  var s=cfg.len/Math.max(size.x,0.001);
  orient.scale.multiplyScalar(s);
  holder.updateMatrixWorld(true);
  bb=new THREE.Box3().setFromObject(holder);
  if(airframeBounds){orient.updateMatrix();bb.copy(airframeBounds.clone().applyMatrix4(orient.matrix));}
  var c2=bb.getCenter(new THREE.Vector3());
  orient.position.set(cfg.centerX-c2.x,cfg.centerY-c2.y,-c2.z);
  if(key==='b24lo'){orient.updateMatrix();holder.userData.nativeMatrix=orient.matrix.toArray();}
  if(isB24&&typeof makeProp==='function'){
    orient.updateMatrix();
    [[-7.80,0.095,2.91],[-3.38,-0.055,3.20],[3.38,-0.055,3.21],[7.79,0.095,2.90]]
      .forEach(function(np){
        var propFit=makeProp(0.90,3);
        propFit.name='B-24J rotating propeller';
        propFit.position.copy(new THREE.Vector3(np[0],np[1],np[2]).applyMatrix4(orient.matrix));
        holder.add(propFit);
      });
  }
  /* fighters whose models ship without prop nodes get a spinning
     blur disc at the model's ACTUAL nose (front-most point) */
  if(cfg.addProp&&props.length===0&&typeof makeProp==='function'){
    var pr2=makeProp(0.42,cfg.addProp===4?4:3);
    /* the RECENTERED nose: bb was measured before the final recenter */
    pr2.position.set(cfg.centerX+(bb.max.x-c2.x)-0.22,(cfg.centerY||0)+0.05,0);
    holder.add(pr2);
  }
  /* locate the REAL cockpit: the instrument-gauge materials sit on the
     panel — seat the crew camera relative to that, not to guesses */
  if(key==='b24detail'){
    /* Station coordinates are calibrated to named geometry in the
       supplied b24j-interior-olive source. Native +Z is the nose;
       transform each native eyepoint through the exact model fit so
       cameras sit at a seated/standing man's EYE HEIGHT, not at his
       chest or at the floor. No procedural people are added. */
    orient.updateMatrix();
    function seat(native,look){
      var p3=new THREE.Vector3(native[0],native[1],native[2]).applyMatrix4(orient.matrix);
      var l3=new THREE.Vector3(look[0],look[1],look[2]).applyQuaternion(orient.quaternion).normalize();
      return {offset:{x:p3.x,y:p3.y,z:p3.z},look:{x:l3.x,y:l3.y,z:l3.z}};
    }
    V2.DETAIL_SEATS={
      pilot: seat([-0.50, 0.58, 4.00],[0,-0.24,1]),
      copilot:seat([ 0.50, 0.58, 4.00],[0,-0.24,1]),
      nav:    seat([-0.08, 0.12, 4.92],[-0.35,-0.28,0.9]),
      bomb:   seat([ 0.00,-0.38, 5.52],[0,-0.45,1]),
      nose:   seat([ 0.00, 0.25, 6.55],[0,-0.02,1]),
      ttop:   seat([ 0.00, 0.92,-3.15],[0,0.02,1]),
      ball:   seat([ 0.00,-1.43,-5.30],[0,-0.78,-0.62]),
      tail:   seat([ 0.00,-0.32,-10.28],[0,-0.06,-1]),
      waistL: seat([ 0.43,-0.03,-6.68],[1,-0.04,0]),
      waistR: seat([-0.43,-0.03,-5.88],[-1,-0.04,0]),
      radio:  seat([-0.25, 0.24, 1.55],[-0.37,-0.20,-0.67])
    };
    V2.detailRoomScale=orient.scale.x*0.5;
    console.log('KM v3: ten supplied-interior station eyelines calibrated');
  }
  V2.templates[key]=holder;
  /* swap any aircraft already in the scenes */
  V2._pendingPlanes.forEach(function(p){
    if(p.key!==key||p.done)return;
    p.done=true;
    var focused=KM._camState&&KM._camState._intFor===p.group;
    if(focused)V2.detachInterior();
    for(var i=p.group.children.length-1;i>=0;i--)p.group.remove(p.group.children[i]);
    p.group.add(holder.clone());
    if(focused)V2.attachInterior(p.group);
  });
  console.log('KM v2: model ready —',key);
};

V2.makeAircraft=function(key,procFallback){
  var g=new THREE.Group();
  if(V2.templates[key]){
    g.add(V2.templates[key].clone());
  }else{
    var pf=procFallback();
    while(pf.children.length)g.add(pf.children[0]);
    V2._pendingPlanes.push({key:key,group:g,done:false});
  }
  return g;
};

KM._buildB24=function(){return V2.makeAircraft('b24lo',PROC.b24);};
KM._buildB24Hi=KM._buildB24;
KM._buildBf109=function(){return V2.makeAircraft('bf109',PROC.bf109);};
KM._buildP51=function(){return V2.makeAircraft('p51',PROC.p51);};
/* a properly licensed Fw 190 at last (manilov.ap, CC-BY-4.0) */
PROC.fw190=KM._buildFw190;
KM._buildFw190=function(){return V2.makeAircraft('fw190',PROC.fw190);};
V2.procB24=PROC.b24;

V2.loadModels=function(){
  if(V2._modelsLoading)return;V2._modelsLoading=true;
  if(!THREE.GLTFLoader){console.warn('KM v2: GLTFLoader missing');return;}
  var loader=new THREE.GLTFLoader();
  Object.keys(V2.MODEL_URLS).forEach(function(key){
    fetch(V2.MODEL_URLS[key]).then(function(r){return r.arrayBuffer();})
      .then(function(buf){
        loader.parse(buf,'',function(gltf){
          try{V2.prepareTemplate(gltf,key);}
          catch(e){console.error('KM v2: template '+key,e);}
        },function(err){console.error('KM v2: parse '+key,err);});
      }).catch(function(e){console.warn('KM v2: model fetch failed '+key,e);});
  });
};

/* spin GLB props from the ambient loop */
V2.spinGlbProps=function(root,amt){
  root.traverse(function(o){
    if(o.userData&&o.userData.glbProp)o.rotation[o.userData.spinAxis||'z']+=amt;
  });
};
/* ═══════════════════ BATTLE ENGINE V2 ═══════════════════
   Replaces the v1 animation loop and battle mechanics:
   - the full 6-minute battle plays out (v1 looped after ~60 s)
   - every shot-down ship falls from the formation to its REAL crash
     site from the Giesler map, leaving a burning smoke column there
   - stragglers limp away to Manston / allied territory; survivors
     rally and turn for home in the aftermath
   - fighter waves slash through the box with tracers; escorts leave
     chasing decoys and return late — as it happened
   - the sun climbs from dawn to mid-morning across the mission
   - the timeline scrubber works through the whole battle */

var BATTLE_SPAN=420;          /* legacy battle/rally cue range; not physical seconds */
var BATTLE_START=0.84;        /* Sturmgruppen strike — the moment they turn WEST */
var BATTLE_FRAC=0.08;         /* battle .81–.92 */
var BATTLE_CLOCK_RATE=5.6;    /* legacy cue units per playback second */
var CRUISE_ROUTE_RATE=0.0095;
var BATTLE_ROUTE_RATE=BATTLE_CLOCK_RATE*BATTLE_FRAC/BATTLE_SPAN;
var RETURN_START=0.92;        /* return home .92–1.0 */
var WRONG_TURN=0.56;          /* the IP — the lead formation fails to turn, alone */
var BOMBS_AWAY=0.65;          /* bombs dropped on Göttingen, in error */
/* ── shared continuous-arc mapping ──
   Both the anchor and every ship sample ONE merged curve (KM._full),
   so there is no lateral-offset flip at the outbound->return handoff.
   The two-phase mission timing (outbound 0..RETURN_START, return
   RETURN_START..1) is preserved by mapping to arc length, with the
   junction located once on the merged curve. */
function fullArc(mt){
  var F=KM._full; if(!F)return 0;
  var fL=F.__len||(F.__len=F.getLength());
  if(V2.routeEventGeo){
    if(!F.__eventArcs){
      F.__eventArcs=V2.routeEventGeo.map(function(e,i){
        if(i===0)return [e[0],0];
        if(i===V2.routeEventGeo.length-1)return [e[0],fL];
        var target=GEO.lonLatToXZ(e[1],e[2]),best=Infinity,at=0;
        function distance(t){var p=F.getPointAt(t);return Math.pow(p.x-target[0],2)+Math.pow(p.z-target[1],2);}
        for(var t=0;t<=1;t+=.001){var d=distance(t);if(d<best){best=d;at=t;}}
        var lo=Math.max(0,at-.001),hi=Math.min(1,at+.001);
        for(var j=0;j<24;j++){var l=lo+(hi-lo)/3,r=hi-(hi-lo)/3;if(distance(l)<distance(r))hi=r;else lo=l;}
        return [e[0],(lo+hi)/2*fL];
      });
      var arcs=F.__eventArcs;
      F.__eventSlopes=arcs.map(function(e,i){
        var left=i?(e[1]-arcs[i-1][1])/(e[0]-arcs[i-1][0]):null;
        var right=i<arcs.length-1?(arcs[i+1][1]-e[1])/(arcs[i+1][0]-e[0]):null;
        if(left===null)return right;if(right===null)return left;
        return left>0&&right>0?2*left*right/(left+right):0;
      });
    }
    var knots=F.__eventArcs,slopes=F.__eventSlopes;
    mt=Math.max(0,Math.min(1,mt));
    for(var k=1;k<knots.length;k++)if(mt<=knots[k][0]){
      var a=knots[k-1],b=knots[k],h=b[0]-a[0],u=(mt-a[0])/h,u2=u*u,u3=u2*u;
      return (2*u3-3*u2+1)*a[1]+(u3-2*u2+u)*h*slopes[k-1]+(-2*u3+3*u2)*b[1]+(u3-u2)*h*slopes[k];
    }
  }
  if(F.__jArc===undefined){
    var jp=KM._curve.getPointAt(1),best=1e9,bt=0;
    for(var s=0;s<=1;s+=0.002){var pp=F.getPointAt(s);var dx=pp.x-jp.x,dz=pp.z-jp.z,dd=dx*dx+dz*dz;if(dd<best){best=dd;bt=s;}}
    F.__jArc=bt*fL;
  }
  var jA=F.__jArc;
  return (mt>=RETURN_START)? jA+Math.min(1,(mt-RETURN_START)/(1-RETURN_START))*(fL-jA)
                          : Math.min(1,mt/RETURN_START)*jA;
}

var hash=function(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))>>>0;return h;};

function fateTimeOf(pd){return pd&&pd.fateTime!=null?pd.fateTime:null;}
function behaviorOf(pd){
  if(!pd||!pd.behavior||pd.behavior==='rtb')return 'stay';
  return pd.behavior==='shot_down'?'fall':pd.behavior;
}

/* timeline phases — the documented mission, wrong turn included */
KM._missionPhases={
  departure:{start:0,   name:'DEPARTURE',                          alt:1200, spd:185},
  climb:    {start:0.10,name:'CLIMBING OUT',                       alt:12000,spd:170},
  northsea: {start:0.22,name:'OVER NORTH SEA',                     alt:18000,spd:195},
  continent:{start:0.42,name:'OVER THE CONTINENT',                 alt:21000,spd:190},
  approach: {start:0.50,name:'APPROACHING THE IP',                 alt:23000,spd:185},
  naverror: {start:0.56,name:'NAVIGATION ERROR — SEPARATED FROM THE STREAM',alt:23000,spd:185},
  bombs:    {start:0.65,name:'BOMBS AWAY NEAR GÖTTINGEN — IN ERROR',alt:23000,spd:185},
  battle:   {start:0.84,name:'UNDER ATTACK',                       alt:23000,spd:175},
  ret:      {start:0.92,name:'THE LONG WAY HOME — WEST OVER THE RHINE',alt:18000,spd:200},
  ret2:     {start:0.955,name:'OVER HOLLAND — STRAGGLERS LETTING DOWN',alt:12000,spd:195},
  ret3:     {start:0.975,name:'NORTH SEA — ENGLAND AHEAD',         alt:6000, spd:185},
  home:     {start:0.992,name:'TIBENHAM — 25 SHIPS DID NOT RETURN',alt:1200, spd:155}
};

/* the battle as the survivors described it — no decoys, no fiction */
V2.EVENTS=[
  {t:0,  d:'STURMGRUPPEN SIGHTED — ASTERN AND CLIMBING'},
  {t:14, d:'COMPANY FRONT — FIRST PASS FROM SIX O’CLOCK'},
  {t:24, d:'“THE SKIES WERE FULL OF BRIGHT FLASHES FROM THE EXPLODING SHELLS” — GEORGE COLLAR'},
  {t:40, d:'B-24S BEGINNING TO FALL — SMOKE TRAILS'},
  {t:85, d:'HEIGHT OF THE ATTACK — SHIPS GOING DOWN'},
  {t:145,d:'CHUTES IN THE AIR ACROSS THE HILLS'},
  {t:210,d:'GUNNERS FIGHTING BACK — STURMBÖCKE FALLING'},
  {t:300,d:'MUSTANGS ARRIVE — DRIVING THE GERMANS OFF'},
  {t:360,d:'RALLY — SURVIVORS TURN FOR HOME'}
];

/* Documented aircraft-specific damage and loss motion. These replace
   the old hash-based random crashes. The short notes are intentionally
   concise descriptions from the mission record, not invented drama. */
V2.LOSS_PROFILES={
  Chilton:{motion:'breakup',event:0.46,note:'Lead ship exploded; the tail separated before impact.'},
  Bruce:{motion:'rammed',event:0.25,note:'Two engines afire; rammed by an Fw 190 and exploded.'},
  Pearson:{motion:'burning_glide',note:'Nos. 1 and 2 engines afire; elevator control burned through.'},
  Carrow:{motion:'breakup',event:0.42,note:'Patches broke into two sections while the crew escaped.'},
  Hansen:{motion:'explosion',event:0.30,note:'The aircraft erupted and exploded southwest of Richelsdorf.'},
  Miner:{motion:'controlled_then_spin',spinStart:0.76,pilotExitPhase:0.78,note:'Miner manually flew the burning aircraft while the crew escaped. He recalled leaving the controls near 10,000 feet, using the open nose-wheel exit because the bomb bay was closed, and the aircraft beginning to spin before he dropped clear. Phase timings are reconstruction estimates.'},
  Jones:{motion:'burning_glide',note:'Severe internal fire; crew escaped through the camera hatch and bomb bay.'},
  Sollien:{motion:'wing_fire',note:'Both wings afire; crew bailed through the bomb bay.'},
  Walther:{motion:'rammed_tail',event:0.32,note:'An Fw 190 rammed the tail; the pilot was thrown clear.'},
  Golden:{motion:'controlled_bailout',note:'Bomb-bay doors were cranked open by hand for the bailout.'},
  Reynolds:{motion:'belly_landing',note:'Hit by Rhine flak; belly-landed east of Polch.'},
  Bruland:{motion:'controlled_bailout',note:'No. 3 engine afire; repeatedly leveled so all nine could bail out.'},
  Donald:{motion:'flat_spin',note:'Burning flat spin; Eric Smith climbed back in after his chute snagged.'},
  Warman:{motion:'tumble',note:'Tail gunner blown clear; the burning aircraft fell near Gerstungen.'},
  Schaen:{motion:'burning_glide',note:'Nose turret jammed; Collar and Bean escaped through the nose-wheel door.'},
  Potts:{motion:'wing_explosion',event:0.34,note:'Wing tanks exploded during the attack.'},
  Baynham:{motion:'wing_fire',note:'Interior described as a furnace; crew used the camera hatch.'},
  Brent:{motion:'breakup',event:0.43,note:'Burning aircraft broke in two; survivors were thrown or bailed clear.'},
  Johnson:{motion:'burning_glide',note:'Crew bailed before the aircraft struck near Breitau.'},
  Bolin:{motion:'wing_explosion',event:0.24,note:'20/30 mm fire detonated the wing tanks; one man escaped.'},
  Elder:{motion:'tumble',note:'Low-left element leader destroyed southwest of Lindenau.'},
  Seeds:{motion:'wingless_roll',event:0.26,note:'Both burning wings separated; the wingless fuselage barrel-rolled and exploded.'},
  Mowat:{motion:'wing_fire',note:'Fuel and internal fire; two crewmen escaped the aircraft.'},
  Fromm:{motion:'controlled_bailout',note:'Pilot warned the crew early; everyone except the copilot escaped.'},
  Hautman:{motion:'burning_glide',note:'Runaway No. 4 prop tore into No. 3; later brought down by low-altitude flak.'}
};

/* Documented bailouts with fatal outcomes are still represented by
   parachutes. KIA alone does not establish that a man died aboard.
   Miner/Chima: Society crew account states he bailed out and was later
   found in forest; see reference/society-crew-cms-snapshot.json.
   Exact exit time, canopy opening and cause of death remain unknown. */
V2.GROUND_DEATH_BAILOUTS={
  Bruland:['Ferdinand K. Flach','Lee R.J. Huffman'],
  Baynham:['Hektor V. Scala','John W. Cowgill','James T. Fields'],
  Carrow:['Newell W. Brainard'],
  Donald:['Myron H. Donald'],
  Johnson:['William E. Flickner'],
  Elder:['John J. Donahue'],
  Miner:['Joseph H. Gilfoil','Virgil Chima'],
  Golden:['Norman J. Stewart'],
  Warman:['Francis W. Costley'],
  Hansen:['Charles C. Palmer','Porter M. Pile','James M. Triplett','Ralph H. Bode','S E. Howell']
};
V2.BAILOUT_EVIDENCE={Miner:{
  gilfoil:'Miner recalled that Gilfoil was wounded in the knee area and assisted out over the battle area. Exact exit time and cause of death are unconfirmed.',
  miner:'Miner recalled a head-first exit through the nose-wheel opening after releasing the controls; he delayed opening his parachute to clear the spinning aircraft. Exact timing is unknown.'
}};
V2.bailoutEvidenceFor=function(pilot,member){
  var crew=V2.BAILOUT_EVIDENCE[pilot];return crew&&member?crew[member.s]||'':'';
};
V2.bailoutCrewFor=function(pilot){
  var list=(V2.CREW_LISTS&&V2.CREW_LISTS[pilot])||[];
  var extra=V2.GROUND_DEATH_BAILOUTS[pilot]||[];
  return list.filter(function(m){
    return /POW|hospital|stalag/i.test(m.o||'')||extra.indexOf(m.n)>=0;
  }).sort(function(a,b){
    return (/^(pilot|command pilot)$/i.test(a.r||'')?1:0)-(/^(pilot|command pilot)$/i.test(b.r||'')?1:0);
  });
};

/* ---------- anchor (formation reference point) ----------
   Arc-length parameterized (getPointAt) with a low-passed time input,
   so the formation's ground speed never jumps — no more "pause" when
   the battle pacing kicks in. Banking is derived from yaw rate, like
   a real airplane. */
KM._anchor={pos:new THREE.Vector3(),dir:new THREE.Vector3(1,0,0),heading:0,roll:0};
function updateAnchor(missionT,battleT,dt){
  var a=KM._anchor,curve=KM._curve;
  if(!curve)return;
  /* Route/timeline interpolation already controls pacing. Filtering
     its result again made aircraft lag, drift through turns and retain
     frame-history-dependent positions after seeking. Smooth cameras,
     not the reconstruction clock. */
  a._mt=missionT;
  var F=KM._full;
  if(F){
    var fL=F.__len||(F.__len=F.getLength());
    var t=Math.max(0,Math.min(1,fullArc(a._mt)/fL));
    var p=F.getPointAt(t);
    var tan=F.getTangentAt(Math.min(t,0.999)).clone();tan.y=0;tan.normalize();
    a.pos.copy(p);
    if(a._mt>=RETURN_START){
      /* the post-return descent target (3 + p.y*0.55) sat 5 units below
         the pre-return cruise value (p.y+8) — a hard step the instant
         a._mt crossed RETURN_START, which read as a "dip" right at the
         return marker. Ease FROM the continuous pre-return value TOWARD
         the descent target instead of snapping to it. */
      var u=(a._mt-RETURN_START)/(1-RETURN_START);
      var eu=u*u*(3-2*u);
      var startY=p.y+8,endY=3+p.y*0.55;
      a.pos.y=startY+(endY-startY)*eu;
    }
    else a.pos.y=p.y+8;
    a.dir.copy(tan);
  }else{
    var t2=Math.min(a._mt/RETURN_START,1);
    var p2=curve.getPointAt(t2);
    var tan2=curve.getTangentAt(Math.min(t2,0.99)).clone();tan2.y=0;tan2.normalize();
    a.pos.copy(p2);a.pos.y+=8;
    a.dir.copy(tan2);
  }
  /* touchdown: once the formation is rolling out at Tibenham (the post-
     missionT-1 hold), settle firmly onto the actual ground height
     instead of hanging at the formulaic ~5-unit cruise-descent value —
     and level the wings, so it reads as parked, not still flying. */
  var settle=Math.min(1,(KM._holdT||0)/2.5);
  if(settle>0){
    var gY=1.8;
    try{gY=Math.max(1.8,(V2.demReady?V2.elevAt(a.pos.x,a.pos.z)*ELEV_SCALE:1.8)+1.8);}catch(e3){}
    /* never let a bad DEM sample (NaN/Infinity off the edge of a tile)
       poison the anchor position — that would silently push the WHOLE
       formation off to an undrawable spot for the rest of the session,
       reading as "the planes disappeared" right at touchdown. */
    if(isFinite(gY))a.pos.y+=(gY-a.pos.y)*settle;
  }
  a.heading=Math.atan2(-a.dir.x,-a.dir.z);
  /* Estimate coordinated bank from geographic curvature, never from
     accelerated playback yaw/time. 105 m/s is an explicit nominal TAS
     estimate, NOT an aircraft-specific validated flight condition. Wind,
     sideslip and force integration are not represented by this renderer. */
  var targetRoll=0;
  if(F){
    var at=Math.max(0,Math.min(1,fullArc(a._mt)/fL)),step=.0001;
    function geoPoint(t){var p=F.getPointAt(Math.max(0,Math.min(1,t)));return {lon:GEO.xToLon(p.x),lat:GEO.zToLat(p.z)};}
    targetRoll=KasselFlightAttitude.coordinatedBank(geoPoint(at-step),geoPoint(at),geoPoint(at+step),V2.nominalTASMps||105);
    targetRoll=Math.max(-.48,Math.min(.48,targetRoll)); /* render cap, not flight-envelope validation */
  }
  a.roll+=(targetRoll-a.roll)*Math.min(1,dt*2.5);
  if(settle>0)a.roll*=(1-settle);   /* wings level for the roll-out */
}

/* ---------- per-plane battle state ---------- */
/* userData.v2: {beh,ft,dur,site,sitePos,startPos,phaseSeed} */
function initPlaneBattle(p,scene){
  var pd=p.userData.planeData;
  var v={beh:behaviorOf(pd),ft:fateTimeOf(pd),seed:hash((pd&&pd.pilot)||String(p.userData.id))};
  if(pd&&pd.pilot){
    var it=V2.crashSiteFor(scene,pd.pilot);
    if(it)v.sitePos=it.pos.clone();
    v.pilot=pd.pilot;
  }
  /* fall duration scales with distance from the battle leg — the
     long-range stragglers (Miner, Bruland, Hautman, Reynolds) glide
     away burning for miles */
  var bx=GEO.lonToX(9.95),bz=GEO.latToZ(51.10);
  var dist=v.sitePos?Math.max(60,v.sitePos.distanceTo(new THREE.Vector3(bx,115,bz))):80;
  v.dur=Math.max(28,Math.min(130,(dist*0.16+(v.seed%10))*1.4));
  v.profile=(pd&&V2.LOSS_PROFILES[pd.pilot])||{motion:'burning_glide',note:'Aircraft lost during the attack.'};
  var motion=v.profile.motion;
  v.style=motion==='controlled_then_spin'?2:/spin/.test(motion)?0:/explosion|rammed/.test(motion)?1:/glide|landing|bailout|wing_fire/.test(motion)?2:3;
  v.bailoutCrew=(pd&&pd.fate==='r')?V2.bailoutCrewFor(pd.pilot):[];
  if(pd){pd.bailoutCrew=v.bailoutCrew;pd.chuteCount=v.bailoutCrew.length;pd.lossNote=v.profile.note;}
  /* each ship dies its own way — duration varies with the style too */
  /* Reconstruction pacing, not claimed measured time-to-impact.
     Controlled losses remain airborne substantially longer than breakups. */
  if(v.style===1)v.dur*=1.15;
  if(v.style===2)v.dur=Math.max(180,v.dur*2.8);
  if(v.style===3)v.dur*=1.6;
  p.userData.v2=v;
  p.rotation.order='YZX';
}

/* burning-wreck smoke columns */
var columns=[];KM._v2Columns=columns;
function addColumn(scene,pos,pilot){
  for(var i=0;i<columns.length;i++)if(columns[i].pilot===pilot)return;
  var glow=new THREE.Sprite(new THREE.SpriteMaterial({
    map:V2.softTex(),color:0xff5a22,transparent:true,opacity:0.7,
    depthWrite:false,blending:THREE.AdditiveBlending}));
  glow.position.copy(pos);glow.position.y+=1.2;
  glow.scale.set(7,5,1);
  scene.add(glow);
  columns.push({pos:pos.clone(),pilot:pilot,glow:glow,t:0});
  if(pilot)V2.revealCrash(scene,pilot);
}
function clearColumns(scene){
  columns.forEach(function(c){scene.remove(c.glow);});
  columns.length=0;
}

/* particle emit into the pools created by _buildFormation */
function emitPool(sys,x,y,z){
  var i=sys.nextIdx;sys.nextIdx=(i+1)%sys.count;
  sys.pos[i*3]=x;sys.pos[i*3+1]=y;sys.pos[i*3+2]=z;
  if(!sys._age)sys._age=new Float32Array(sys.count);
  /* Simulation time, never wall time: smoke freezes exactly with the
     aircraft and cannot creep, expire, or jump back while paused. */
  sys._age[i]=KM._simSeconds||0;
  sys.geo.attributes.position.needsUpdate=true;
}
/* smoke/fire dissipates; hard flush on restart or scrub */
function agePool(sys,maxAge){
  if(!sys||!sys._age)return;
  var now=KM._simSeconds||0,dirty=false;
  for(var i=0;i<sys.count;i++){
    if(sys._age[i]>0&&now-sys._age[i]>maxAge){
      sys._age[i]=0;
      sys.pos[i*3]=-99999;sys.pos[i*3+1]=-99999;sys.pos[i*3+2]=-99999;
      dirty=true;
    }
  }
  if(dirty)sys.geo.attributes.position.needsUpdate=true;
}
function flushPool(sys){
  if(!sys)return;
  for(var i=0;i<sys.count;i++){
    sys.pos[i*3]=-99999;sys.pos[i*3+1]=-99999;sys.pos[i*3+2]=-99999;
    if(sys._age)sys._age[i]=0;
  }
  sys.geo.attributes.position.needsUpdate=true;
}

/* ---------- tracers — glowing volumetric streaks ----------
   Billboarded streak quads with a hot white core fading through the
   round's burn color: German 13/20 mm burned green-white, the .50s
   answered in red-orange. */
var tracers=null;
function tracerTex(green){
  var c=document.createElement('canvas');c.width=128;c.height=16;
  var g=c.getContext('2d');
  var gr=g.createLinearGradient(0,0,128,0);
  if(green){
    gr.addColorStop(0,'rgba(70,220,140,0)');
    gr.addColorStop(0.55,'rgba(110,235,165,0.5)');
    gr.addColorStop(0.85,'rgba(180,255,210,0.9)');
    gr.addColorStop(1,'rgba(225,255,235,1)');
  }else{
    gr.addColorStop(0,'rgba(255,70,10,0)');
    gr.addColorStop(0.55,'rgba(255,120,30,0.55)');
    gr.addColorStop(0.85,'rgba(255,190,90,0.9)');
    gr.addColorStop(1,'rgba(255,235,185,1)');
  }
  g.fillStyle=gr;g.fillRect(0,0,128,16);
  /* soften the edges */
  var gv=g.createLinearGradient(0,0,0,16);
  gv.addColorStop(0,'rgba(0,0,0,1)');gv.addColorStop(0.5,'rgba(0,0,0,0)');gv.addColorStop(1,'rgba(0,0,0,1)');
  g.globalCompositeOperation='destination-out';
  g.fillStyle=gv;g.fillRect(0,0,128,16);
  return new THREE.CanvasTexture(c);
}
function initTracers(scene){
  var n=90;
  var mats=[
    new THREE.MeshBasicMaterial({map:tracerTex(false),transparent:true,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}),
    new THREE.MeshBasicMaterial({map:tracerTex(true),transparent:true,
      blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide})
  ];
  var geo=new THREE.PlaneGeometry(6.5,0.32);
  var pool=[];
  for(var i=0;i<n;i++){
    /* per-mesh material clones so each round can fade independently */
    var m=new THREE.Mesh(geo,mats[0].clone());
    m.visible=false;m.frustumCulled=false;
    scene.add(m);
    pool.push({mesh:m,vel:new THREE.Vector3(),life:0});
  }
  tracers={pool:pool,mats:mats,next:0};
}
function fireTracer(from,to,spread,german){
  if(!tracers)return;
  var t=tracers.pool[tracers.next];
  tracers.next=(tracers.next+1)%tracers.pool.length;
  t.vel.subVectors(to,from).normalize().multiplyScalar(310);
  t.vel.x+=(Math.random()-.5)*spread;
  t.vel.y+=(Math.random()-.5)*spread;
  t.vel.z+=(Math.random()-.5)*spread;
  t.mesh.position.copy(from);
  t.mesh.material.map=tracers.mats[german?1:0].map;
  t.mesh.material.opacity=1;
  t.mesh.visible=true;
  t.life=0.55;
  /* align the streak's long axis with its flight path */
  var d=t.vel.clone().normalize();
  var q=new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1,0,0),d);
  t.mesh.quaternion.copy(q);
}
function updateTracers(dt){
  if(!tracers)return;
  tracers.pool.forEach(function(t){
    if(t.life<=0)return;
    t.life-=dt;
    t.mesh.position.addScaledVector(t.vel,dt);
    t.mesh.material.opacity=Math.max(0,Math.min(1,t.life/0.4));
    if(t.life<=0)t.mesh.visible=false;
  });
}

/* ═════════ defensive fire from the real gun positions ═════════
   Each B-24 answers an attacker from the stations whose field of fire
   covers it: tail, top and nose turrets (twin .50s) and the two waist
   guns. No ball turret: the 445th flew Kassel without them. The ship
   whose crew view is open also shows close-range tracers and muzzle
   flashes, so the gunner's own guns are seen firing. Rates and paths
   are illustrative on the compressed battle clock. */
var GUNS=null,nearTracers=null,flashPool=null;
function gunStations(){
  if(GUNS)return GUNS;
  var cc=window.KasselCrewCompartments,M=(cc&&cc.metresPerModelUnit)||(20.47/33),R=Math.PI/180;
  function u(p){return cc&&cc.toUnits?new THREE.Vector3().fromArray(cc.toUnits(p)):new THREE.Vector3(-p[2]/M+7.55,p[1]/M+1.12-1.18/M,p[0]/M);}
  function g(id,pivot,len,twin,dir,deg){return {id:id,pivot:u(pivot),len:len/M,twin:twin/M,cone:{dir:new THREE.Vector3().fromArray(dir).normalize(),cos:Math.cos(deg*R)}};}
  return GUNS=[
    g('tail',[0,0.80,14.75],1.1,0.11,[-1,0,0],75),
    g('ttop',[0,1.98,2.29],1.2,0.11,[0,1,0],84),
    g('nose',[0,0.62,-4.55],0.9,0.10,[1,0,0],65),
    g('waistL',[-0.86,1.0,8.25],0.9,0,[0,0,-1],62),
    g('waistR',[0.86,1.0,8.05],0.9,0,[0,0,1],62)
  ];
}
function initNearTracers(scene){
  var tex=tracerTex(false),texG=tracerTex(true),pool=[];
  var geo=new THREE.PlaneGeometry(1,1);
  for(var i=0;i<90;i++){
    var grp=new THREE.Group(),mat=new THREE.MeshBasicMaterial({map:tex,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    var a=new THREE.Mesh(geo,mat),b=new THREE.Mesh(geo,mat);b.rotation.x=Math.PI/2;grp.add(a);grp.add(b);
    grp.visible=false;grp.frustumCulled=false;a.frustumCulled=b.frustumCulled=false;scene.add(grp);
    pool.push({g:grp,mat:mat,vel:new THREE.Vector3(),life:0});
  }
  nearTracers={pool:pool,next:0,tex:tex,texG:texG};
}
function fireNearTracer(from,to,german){
  if(!nearTracers)return;
  var t=nearTracers.pool[nearTracers.next];nearTracers.next=(nearTracers.next+1)%nearTracers.pool.length;
  var d=to.clone().sub(from);var dist=d.length();if(dist<1e-6)return;d.divideScalar(dist);
  d.x+=(Math.random()-.5)*.03;d.y+=(Math.random()-.5)*.03;d.z+=(Math.random()-.5)*.03;d.normalize();
  t.vel.copy(d).multiplyScalar(4.6);   /* ~880 m/s at about 190 m per scene unit */
  t.g.position.copy(from);t.g.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),d);
  t.g.scale.set(.16,.004,.004);t.mat.map=german?nearTracers.texG:nearTracers.tex;t.mat.opacity=1;
  t.g.visible=true;t.life=Math.min(1.8,dist/4.6+.4);
}
function updateNearTracers(dt){
  if(!nearTracers)return;
  nearTracers.pool.forEach(function(t){
    if(t.life<=0)return;t.life-=dt;t.g.position.addScaledVector(t.vel,dt);
    t.mat.opacity=Math.max(0,Math.min(1,t.life/.3));if(t.life<=0)t.g.visible=false;
  });
  (flashPool||[]).forEach(function(f){if(f.life>0){f.life-=dt;if(f.life<=0)f.sp.visible=false;}});
}
function muzzleFlash(plane,local,dir,own){
  if(!flashPool){flashPool=[];for(var i=0;i<16;i++){var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:V2.softTex(),color:0xffcf73,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));sp.visible=false;flashPool.push({sp:sp,life:0});}}
  var f=flashPool.filter(function(q){return q.life<=0;})[0]||flashPool[0];
  if(f.sp.parent!==plane)plane.add(f.sp);
  f.sp.position.copy(local).addScaledVector(dir,.25);
  var size=(own?.9:1.4)*(0.75+Math.random()*.5);f.sp.scale.set(size,size,1);
  f.sp.visible=true;f.life=.045+Math.random()*.04;
}
V2.returnFire=function(bomber,fighter){
  if(!bomber||!fighter)return;
  var G=gunStations(),c=KM._camState;bomber.updateMatrixWorld(true);
  var inv=new THREE.Matrix4().copy(bomber.matrixWorld).invert();
  var rel=fighter.position.clone().applyMatrix4(inv);
  var focus=c&&c.mode==='crew'&&c._intFor===bomber;
  G.forEach(function(g){
    var d=rel.clone().sub(g.pivot),dist=d.length();if(dist<1e-6)return;d.divideScalar(dist);
    if(d.dot(g.cone.dir)<g.cone.cos)return;
    var side=new THREE.Vector3().crossVectors(d,new THREE.Vector3(0,1,0));if(side.lengthSq()<1e-6)side.set(0,0,1);side.normalize();
    (g.twin?[-1,1]:[0]).forEach(function(k){
      var m=g.pivot.clone().addScaledVector(d,g.len).addScaledVector(side,k*g.twin),w=bomber.localToWorld(m.clone());
      if(Math.random()<.35)fireTracer(w,fighter.position,9,false);
      if(focus){fireNearTracer(w,fighter.position,false);muzzleFlash(bomber,m,d,c.crewPos===g.id);}
    });
  });
};

/* ---------- the bomb drop — visible, falling, impacting ---------- */
var bombs=[];
var bombVisual;
function prepareBombVisual(){
  if(!bombVisual){
    var outline=[[0,-1.15],[.21,-.97],[.32,-.60],[.32,.55],[.17,.85],[.14,1.1]];
    var tailPoints=[];
    for(var fin=0;fin<4;fin++){
      var angle=fin*Math.PI/2,x=Math.cos(angle),z=Math.sin(angle);
      var a=[.22*x,.59,.22*z],b=[.43*x,1.04,.43*z],c=[.43*x,1.19,.43*z],d=[.13*x,1.19,.13*z];
      tailPoints.push(...a,...b,...c,...a,...c,...d);
      var next=angle+Math.PI/2;
      var outer=[.43*Math.cos(next),1.19,.43*Math.sin(next)];
      var inner=[outer[0],1.03,outer[2]];
      tailPoints.push(...b,...c,...outer,...b,...outer,...inner);
    }
    var tail=new THREE.BufferGeometry();
    tail.setAttribute('position',new THREE.Float32BufferAttribute(tailPoints,3));
    tail.computeVertexNormals();
    bombVisual={
      tail:tail,
      geometry:new THREE.LatheGeometry(outline.map(function(p){return new THREE.Vector2(p[0],p[1]);}),16),
      material:new THREE.MeshStandardMaterial({color:0x474b39,roughness:.84,metalness:.22,side:THREE.DoubleSide}),
      nose:new THREE.Vector3(0,-1,0),velocity:new THREE.Vector3()
    };
  }
}
function queueBombs(scene,plane,index,release,samplePosition){
  prepareBombVisual();
  var scale=plane.userData.mapGeometryScale||plane.scale.x;
  for(var i=0;i<4;i++){
    var born=release+index*.12+i*.28;
    var route=KMMissionTimeline.routeAt(born);
    var launch=new THREE.Vector3();
    samplePosition(launch,route);
    launch.y-=2.5*scale;
    var track=KM._full;
    var direction=track?track.getTangentAt(Math.min(1,fullArc(route)/(track.__len||track.getLength()))):KM._anchor.dir;
    var mesh=new THREE.Mesh(bombVisual.geometry,bombVisual.material);
    mesh.name='mission-bomb';
    mesh.add(new THREE.Mesh(bombVisual.tail,bombVisual.material));
    mesh.visible=false;
    scene.add(mesh);
    bombs.push({mesh:mesh,scene:scene,born:born,launch:launch,scale:scale,vx:direction.x*7,vz:direction.z*7});
  }
}
function updateBombs(seconds,camera,showImpacts){
  var canvas=KM._ren.domElement;
  var pixelSpan=2*Math.tan(camera.fov*Math.PI/360)/Math.max(1,canvas.clientHeight);
  for(var i=bombs.length-1;i>=0;i--){
    var b=bombs[i],age=seconds-b.born;
    if(age<0)continue;
    var pos=b.mesh.position;
    // Use the playback clock so the same drop is visible after a seek.
    pos.set(b.launch.x+b.vx*age,b.launch.y-10*age-15*age*age,b.launch.z+b.vz*age);
    var gy=(V2.groundAt&&V2.groundAt(pos.x,pos.z))??2;
    if(pos.y<=gy){
      if(showImpacts){
        killFlash(b.scene,new THREE.Vector3(pos.x,gy+.08,pos.z),.35);
        for(var puff=0;puff<4;puff++)emitPool(KM._smoke,pos.x,gy+.18+puff*.25,pos.z);
      }
      b.scene.remove(b.mesh);
      bombs.splice(i,1);
      continue;
    }
    b.mesh.visible=true;
    // A minimum screen size keeps a distant payload legible. It affects
    // the display mesh only, never the sampled release or impact position.
    b.mesh.scale.setScalar(Math.max(b.scale,pixelSpan*camera.position.distanceTo(pos)*2));
    b.mesh.quaternion.setFromUnitVectors(bombVisual.nose,bombVisual.velocity.set(b.vx,-10-30*age,b.vz).normalize());
  }
}
function clearBombs(){
  bombs.forEach(function(b){b.scene.remove(b.mesh);});
  bombs.length=0;
}

/* ---------- parachutes — the men who got out and survived as POWs ---------- */
V2._chutes=[];
V2.chuteTex=function(){
  if(V2._chuteTex)return V2._chuteTex;
  var c=document.createElement('canvas');c.width=64;c.height=96;
  var g=c.getContext('2d');
  g.fillStyle='rgba(228,224,212,0.95)';
  g.beginPath();g.arc(32,26,24,Math.PI,0);g.closePath();g.fill();
  g.strokeStyle='rgba(190,186,176,0.9)';
  g.beginPath();g.arc(32,26,24,Math.PI,0);g.stroke();
  /* shroud lines */
  g.strokeStyle='rgba(200,200,195,0.7)';g.lineWidth=1;
  [8,20,32,44,56].forEach(function(x){
    g.beginPath();g.moveTo(x,26);g.lineTo(32,72);g.stroke();
  });
  /* the man */
  g.fillStyle='rgba(30,32,30,0.95)';
  g.fillRect(29,70,6,12);
  g.fillRect(27,80,3,9);g.fillRect(34,80,3,9);
  V2._chuteTex=new THREE.CanvasTexture(c);
  return V2._chuteTex;
};
/* real 3D parachutes: silk hemisphere canopy, shroud lines, the man */
function chuteTemplate(){
  if(V2._chuteTpl)return V2._chuteTpl;
  V2._chuteTpl=KasselParachuteGeometry.build(THREE);
  return V2._chuteTpl;
}
/* World position of a crewman's exit on the falling ship at loss cue bu,
   and mark that opening open so the doors show (V2.updateDamage). */
var _exitDummy=null;
function bailoutExitPoint(p,v,bu,plan,member){
  var BX=window.KasselBailoutExits,surf=dmgSurface();
  if(!BX||!surf||!surf.exits)return null;
  var key=plan.exit;
  if(key==='waist_window'&&/left/i.test(plan.note||''))key='waist_window_L';
  var hit=surf.exits[key]||surf.exits[plan.exit];if(!hit)return null;
  var open=BX.OPENS[plan.exit];
  if(open){p.userData.dmgOpen=p.userData.dmgOpen||{};p.userData.dmgOpen[open]=true;}
  var pose=KasselLossTrajectory.pose(v,bu);
  if(!_exitDummy)_exitDummy=new THREE.Object3D();
  _exitDummy.position.set(pose.position.x,pose.position.y,pose.position.z);
  _exitDummy.scale.copy(p.scale);
  KasselFlightAttitude.apply(THREE,_exitDummy,pose.tangent,pose.bank||0);
  _exitDummy.updateMatrixWorld(true);
  var local=hit.p.clone().addScaledVector(hit.n,.35);
  return _exitDummy.localToWorld(local);
}
function spawnChute(scene,pos,member,planeData,index,born,momentum,openingDelay,metresPerUnit){
  var g=chuteTemplate().clone();
  // Approximate 24-ft canopy diameter on the same horizontal map scale
  // used for aircraft. Template diameter is 4.8 units.
  var rootScale=24*.3048/(4.8*metresPerUnit);
  g.scale.setScalar(rootScale);
  /* clone the canopy material so each chute can fade independently */
  g.traverse(function(o){if(o.material)o.material=o.material.clone();});
  g.position.copy(pos);
  /* Preserve the supplied launch position. Random radial placement
     previously teleported crew away from the aircraft at birth. Named
     hashing may vary sway, never invent a bailout doorway. */
  var key=(member&&member.n)||((planeData&&planeData.pilot)||'crew')+index;
  var hs=hash(key);
  var feetY=g.userData.feetY;
  g.userData={airman:member||null,plane:planeData||null,bailoutIndex:index||0,feetY:feetY};
  scene.add(g);
  var gy=2;
  try{gy=Math.max(1.5,(V2.demReady?V2.elevAt(g.position.x,g.position.z):20)*ELEV_SCALE)+.03;}catch(e2){}
  V2._chutes.push({sp:g,scene:scene,member:member||null,plane:planeData||null,
    rig:g.getObjectByName('parachute-canopy-rig'),feetY:feetY,rootScale:rootScale,
    launch:g.position.clone(),momentum:momentum||null,openingDelay:openingDelay||0,born:born,vy:-(2.2+(hs%70)/100),sway:(hs%6283)/1000,ground:gy-rootScale*feetY,landT:0});
}
function articulateChute(ch,age,landedSeconds){
  ch.sp.scale.setScalar(ch.rootScale);
  var pose=KasselParachutePose.pose(age,landedSeconds,ch.feetY,ch.openingDelay);
  ch.rig.visible=pose.rigVisible;
  ch.rig.scale.set(pose.rigScaleXZ,pose.rigScaleY,pose.rigScaleXZ);ch.rig.position.set(pose.rigOffsetX,pose.rigOffsetY,pose.rigOffsetZ);
  if(landedSeconds>0){ch.sp.rotation.x=0;ch.sp.rotation.z=0;}
}
function chuteTerrainHeight(x,z){
  var surface=V2.groundAt&&V2.groundAt(x,z);
  if(surface!==undefined)return surface;
  return Math.max(1.5,(V2.demReady?V2.elevAt(x,z):20)*ELEV_SCALE)+.03;
}
function updateChutes(dt,elapsed){
  for(var i=V2._chutes.length-1;i>=0;i--){
    var ch=V2._chutes[i];
    if(ch.born!==undefined){
      var age=Math.max(0,(KM._playbackSeconds??KMMissionTimeline.secondsAt(KM._missionT))-KMMissionTimeline.playbackAtBattleCue(ch.born));
      if(!ch.contact||ch.contactDEM!==!!V2.demReady||ch.groundRevision!==V2.groundRevision){
        ch.contact=KasselParachuteContact.solve(ch.launch,-ch.vy,ch.sway,ch.rootScale*ch.feetY,chuteTerrainHeight,ch.momentum);
        ch.contactDEM=!!V2.demReady;ch.groundRevision=V2.groundRevision;
      }
      var pos=age>=ch.contact.time?ch.contact.position:KasselParachuteContact.trajectory(ch.launch,-ch.vy,ch.sway,age,ch.momentum);
      ch.sp.position.set(pos.x,pos.y,pos.z);
      ch.sp.rotation.x=Math.sin(age*1.1+ch.sway)*0.08;
      ch.sp.rotation.z=Math.cos(age*0.9+ch.sway)*0.08;
      var landed=Math.max(0,age-ch.contact.time);
      articulateChute(ch,age,landed);
      continue;
    }
    if(ch.sp.position.y>ch.ground){
      ch.sp.position.y+=ch.vy*dt;
      ch.sp.position.x+=Math.sin(elapsed*0.8+ch.sway)*dt*1.2;
      ch.sp.position.z+=Math.cos(elapsed*0.6+ch.sway)*dt*1.0;
      /* pendulum swing under the canopy */
      ch.sp.rotation.x=Math.sin(elapsed*1.1+ch.sway)*0.16;
      ch.sp.rotation.z=Math.cos(elapsed*0.9+ch.sway)*0.16;
    }else{
      ch.landT+=dt;
      /* canopy collapses on the ground, then fades */
      ch.sp.position.y=ch.ground;
      articulateChute(ch,10,ch.landT);
      ch.sp.traverse(function(o){
        if(o.material&&o.material.opacity!==undefined)
          o.material.opacity=Math.max(0,0.96-ch.landT*0.35);
      });
      if(ch.landT>3){ch.scene.remove(ch.sp);V2._chutes.splice(i,1);}
    }
  }
}
function clearChutes(){
  V2._chutes.forEach(function(ch){
    ch.scene.remove(ch.sp);
    ch.sp.traverse(function(o){if(o.material)o.material.dispose();});
  });
  V2._chutes.length=0;
}

/* hit flash when a ship takes its fatal damage */
function killFlash(scene,pos,size){
  var sp=new THREE.Sprite(new THREE.SpriteMaterial({
    map:V2.softTex(),color:0xffb144,transparent:true,opacity:0.95,
    depthWrite:false,blending:THREE.AdditiveBlending}));
  var baseSize=size||4;
  sp.position.copy(pos);sp.scale.set(baseSize,baseSize,1);
  scene.add(sp);
  V2._flashes=V2._flashes||[];
  V2._flashes.push({sp:sp,scene:scene,t:0,baseSize:baseSize});
}
function updateFlashes(dt){
  var fl=V2._flashes||[];
  for(var i=fl.length-1;i>=0;i--){
    var f=fl[i];f.t+=dt;
    var s=f.baseSize*(1+f.t*6);
    f.sp.scale.set(s,s,1);
    f.sp.material.opacity=Math.max(0,0.95-f.t*2.4);
    if(f.t>0.55){f.scene.remove(f.sp);f.sp.material.dispose();fl.splice(i,1);}
  }
}
function clearFlashes(){
  (V2._flashes||[]).forEach(function(f){f.scene.remove(f.sp);f.sp.material.dispose();});
  V2._flashes=[];
}

/* Layered aircraft destruction: a hot pressure flash, expanding fire
   and soot, and substantial fragments that retain forward momentum.
   It is still performant, but no longer reads as one cheap sprite. */
V2._devastation=[];
function spawnDevastation(scene,pos,profile,seed,forward,modelScale){
  var grp=new THREE.Group();grp.position.copy(pos);grp.scale.setScalar(modelScale);scene.add(grp);
  var soft=V2.softTex(),items=[];
  function rnd(n){return ((hash(String(seed)+':'+n)%10000)/10000);}
  for(var i=0;i<8;i++){
    var hot=i<3;
    var sp=new THREE.Sprite(new THREE.SpriteMaterial({
      map:soft,color:hot?(i===0?0xfff1b8:0xff6a20):0x25282c,
      transparent:true,opacity:hot?0.95:0.72,depthWrite:false,
      blending:hot?THREE.AdditiveBlending:THREE.NormalBlending}));
    var sc=hot?4+i*1.8:7+i*1.6;
    sp.scale.set(sc,sc,1);grp.add(sp);
    items.push({o:sp,kind:'puff',v:new THREE.Vector3(
      (rnd(i*7)-0.5)*10,(rnd(i*7+1))*9,(rnd(i*7+2)-0.5)*10),base:sc,hot:hot});
  }
  var drab=new THREE.MeshStandardMaterial({color:0x343b24,metalness:0.35,roughness:0.72});
  var metal=new THREE.MeshStandardMaterial({color:0x62676c,metalness:0.8,roughness:0.38});
  // Major pieces are visual proxies for the recorded kind of separation.
  var motion=profile.motion;
  if(motion==='breakup'||motion==='rammed_tail'||motion==='wingless_roll'){
    var fwd=forward||new THREE.Vector3(1,0,0);
    var sideAxis=new THREE.Vector3(-fwd.z,0,fwd.x);
    var separation=motion==='wingless_roll'?[-1,1]:[0];
    separation.forEach(function(side){
      var piece=new THREE.Group();
      piece.rotation.y=-Math.atan2(fwd.z,fwd.x);
      var section=new THREE.Mesh(side?new THREE.BoxGeometry(4,.28,11):
        new THREE.CylinderGeometry(.52,1.03,6.8,14),drab);
      if(side)section.position.z=side*5;
      else section.rotation.z=Math.PI/2;
      piece.add(section);
      if(!side){
        var tailplane=new THREE.Mesh(new THREE.BoxGeometry(1.85,.16,6),drab);
        tailplane.position.x=-2.2;piece.add(tailplane);
        [-2.7,2.7].forEach(function(z){
          var fin=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),drab);
          fin.scale.set(.9,1.05,.09);fin.position.set(-2.3,.61,z);piece.add(fin);
        });
        piece.position.set(-fwd.x*7,0,-fwd.z*7);
      }
      grp.add(piece);
      items.push({o:piece,kind:'debris',v:fwd.clone().multiplyScalar(side?9:4).addScaledVector(sideAxis,side*11),
        spin:new THREE.Vector3(side*.85,.35,side?-.48:.74)});
    });
  }
  for(var d=0;d<12;d++){
    var large=d<4;
    var shard=new THREE.Mesh(new THREE.BoxGeometry(
      large?2.8+rnd(90+d)*3:0.35+rnd(90+d),
      large?0.18:0.12,
      large?0.8+rnd(120+d)*1.8:0.25+rnd(120+d)*0.8),d%3?drab:metal);
    shard.position.set((rnd(200+d)-0.5)*5,(rnd(240+d)-0.5)*4,(rnd(280+d)-0.5)*5);
    grp.add(shard);
    var f=forward||new THREE.Vector3(1,0,0);
    items.push({o:shard,kind:'debris',v:f.clone().multiplyScalar(12+rnd(320+d)*18).add(new THREE.Vector3(
      (rnd(360+d)-0.5)*28,(rnd(400+d)-0.25)*24,(rnd(440+d)-0.5)*28)),
      spin:new THREE.Vector3(rnd(500+d)*5,rnd(540+d)*5,rnd(580+d)*5)});
  }
  V2._devastation.push({scene:scene,group:grp,items:items,t:0,
    type:(profile&&profile.motion)||'explosion'});
}
function updateDevastation(dt){
  for(var i=V2._devastation.length-1;i>=0;i--){
    var e=V2._devastation[i];e.t+=dt;
    e.items.forEach(function(it){
      it.o.position.addScaledVector(it.v,dt);
      if(it.kind==='debris'){
        it.v.y-=18*dt;it.o.rotation.x+=it.spin.x*dt;it.o.rotation.y+=it.spin.y*dt;it.o.rotation.z+=it.spin.z*dt;
      }else{
        var grow=1+e.t*(it.hot?3.2:1.5);it.o.scale.set(it.base*grow,it.base*grow,1);
        it.o.material.opacity=Math.max(0,(it.hot?0.95:0.72)-e.t*(it.hot?0.85:0.22));
      }
    });
    if(e.t>3.4){disposeDevastation(e);V2._devastation.splice(i,1);}
  }
}
function disposeDevastation(effect){
  effect.scene.remove(effect.group);
  var materials=new Set();
  effect.group.traverse(function(o){
    if(o.isMesh)o.geometry.dispose();
    if(o.material)materials.add(o.material);
  });
  materials.forEach(function(m){m.dispose();});
}
function clearDevastation(){
  V2._devastation.forEach(disposeDevastation);
  V2._devastation.length=0;
}

/* ═══════════ documented battle damage (aircraft-damage.js) ═══════════
   Outside: burning, dead or feathered engines on the recorded engine,
   holes and torn skin in the recorded part of the ship, fires in the
   recorded compartment, and the recorded turret fit (no ball turret on
   the PFF lead and on Sollien's ship; an H2X radome on the PFF lead).
   Inside: daylight through holes, cracked glazing and cabin smoke for
   damage in the compartment the open station looks at. What and where
   come from the crew accounts; WHEN is inferred from the roster cue. */
var DMG_ZONE_X={nose:[10.8,13.4],flightdeck:[5.6,9.6],bombbay:[-0.4,4.8],waist:[-9.2,-2.4],tail:[-17.2,-10.2]};
function dmgFract(v){return v-Math.floor(v);}
function dmgRand(seed){var s=seed>>>0;return function(){s=(Math.imul(s^(s>>>15),2246822507)+0x9e3779b9)>>>0;s^=s>>>13;return (s>>>0)/4294967296;};}
function dmgShared(){
  if(V2._dmgShared)return V2._dmgShared;
  var soft=V2.softTex();
  var holeGeos=[0,1,2].map(function(v){
    var g=new THREE.CircleGeometry(1,13),p=g.attributes.position;
    for(var i=1;i<p.count;i++){var r=.62+dmgFract(Math.sin((i+1)*12.9898+v*78.233)*43758.5453)*.7;p.setXY(i,p.getX(i)*r,p.getY(i)*r);}
    return g;
  });
  var crack=document.createElement('canvas');crack.width=crack.height=256;
  var cx=crack.getContext('2d'),rnd=dmgRand(27091944);
  cx.translate(128,128);cx.strokeStyle='rgba(235,240,240,0.85)';cx.lineCap='round';
  for(var r=0;r<17;r++){
    var ang=r/17*Math.PI*2+rnd()*.3,len=60+rnd()*65,x=0,y=0;cx.lineWidth=1+rnd()*1.4;cx.beginPath();cx.moveTo(0,0);
    for(var s=1;s<=6;s++){x=Math.cos(ang+(rnd()-.5)*.35)*len*s/6;y=Math.sin(ang+(rnd()-.5)*.35)*len*s/6;cx.lineTo(x,y);}
    cx.stroke();
  }
  cx.lineWidth=.9;cx.strokeStyle='rgba(225,232,232,0.55)';
  for(var c=1;c<=3;c++){cx.beginPath();for(var a=0;a<=24;a++){var rr=c*24+rnd()*9,t=a/24*Math.PI*2;if(a)cx.lineTo(Math.cos(t)*rr,Math.sin(t)*rr);else cx.moveTo(Math.cos(t)*rr,Math.sin(t)*rr);}cx.stroke();}
  cx.fillStyle='rgba(10,10,10,0.95)';cx.beginPath();cx.arc(0,0,7,0,Math.PI*2);cx.fill();
  cx.strokeStyle='rgba(255,255,255,0.9)';cx.lineWidth=2;cx.beginPath();cx.arc(0,0,10,0,Math.PI*2);cx.stroke();
  var crackTex=new THREE.CanvasTexture(crack);
  V2._dmgShared={holeGeos:holeGeos,
    hole:new THREE.MeshBasicMaterial({color:0x0d0c0a,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
    rim:new THREE.MeshStandardMaterial({color:0x8a8e90,metalness:.8,roughness:.4,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-3}),
    scorch:new THREE.MeshBasicMaterial({color:0x14110d,transparent:true,opacity:.55,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}),
    daylight:new THREE.MeshBasicMaterial({color:0xfff4dc,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4}),
    beam:new THREE.MeshBasicMaterial({color:0xfff0d0,transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide}),
    beamGeo:new THREE.CylinderGeometry(1,2.6,1,10,1,true).translate(0,.5,0).rotateX(Math.PI/2),
    flame:function(){return new THREE.SpriteMaterial({map:soft,color:0xff7b22,transparent:true,opacity:.85,depthWrite:false,blending:THREE.AdditiveBlending});},
    core:function(){return new THREE.SpriteMaterial({map:soft,color:0xffd27a,transparent:true,opacity:.8,depthWrite:false,blending:THREE.AdditiveBlending});},
    smoke:function(){return new THREE.SpriteMaterial({map:soft,color:0x55524c,transparent:true,opacity:.22,depthWrite:false});},
    crack:new THREE.MeshBasicMaterial({map:crackTex,transparent:true,depthWrite:false,side:THREE.DoubleSide}),
    radome:new THREE.MeshStandardMaterial({color:0x6f705f,roughness:.82,metalness:.08}),
    /* torn skin petals: paint on some, bare aluminium on others (vertex colour) */
    petal:new THREE.MeshStandardMaterial({vertexColors:true,roughness:.72,metalness:.15,side:THREE.DoubleSide}),
    /* stringers and frames behind a tear: zinc-chromate primer */
    structure:new THREE.MeshStandardMaterial({color:0x252b1a,roughness:.8,metalness:.2}),
    /* primed inside of the airframe, seen through the cuts */
    liner:window.KasselDamageVisuals?window.KasselDamageVisuals.linerMaterial(THREE):null,
    /* bomb bay and nose-wheel doors standing open */
    door:new THREE.MeshStandardMaterial({color:0x0d0f07,roughness:.9,metalness:0,side:THREE.DoubleSide}),
    /* crew view: a ragged daylight hole with a torn bare-metal rim */
    holeMask:window.KasselDamageVisuals?window.KasselDamageVisuals.holeMask(THREE):null,
    holeQuads:window.KasselDamageVisuals?window.KasselDamageVisuals.holeQuads(THREE):null};
  if(V2._dmgShared.holeMask)V2._dmgShared.daylightRagged=new THREE.MeshBasicMaterial({map:V2._dmgShared.holeMask,transparent:true,alphaTest:.04,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4,toneMapped:false});
  return V2._dmgShared;
}
/* Sample the formation model's own skin once, so holes sit ON the
   airframe rather than on a guessed fuselage. Plane-local frame. */
function dmgSurface(){
  if(V2._dmgSurf)return V2._dmgSurf;
  var holder=V2.templates&&V2.templates.b24lo;if(!holder)return null;
  holder.updateMatrixWorld(true);
  var meshes=[];
  holder.traverse(function(o){
    if(!o.isMesh||!o.material||o.material.transparent)return;
    for(var q=o;q;q=q.parent)if(q.name==='B-24J rotating propeller'||q.name==='km-ball-turret-exterior')return;
    meshes.push(o);
  });
  var props=[];holder.children.forEach(function(ch){if(ch.name==='B-24J rotating propeller')props.push(ch.position.clone());});
  props.sort(function(a,b){return a.z-b.z;});
  /* Every probe below runs across the airframe at a fixed x, so the skin is
     bucketed into thin slices along x and each probe only tests its slice.
     Raycasting the whole model 350 times stalled the page when the first
     damaged ship appeared. The soup also feeds the interior liner. */
  var tris=[],two=[],tv=new THREE.Vector3();
  meshes.forEach(function(m){
    var g=m.geometry,pa=g.attributes&&g.attributes.position,ix=g.index;if(!pa)return;
    var n=ix?ix.count:pa.count,ds=m.material.side!==THREE.FrontSide;n-=n%3;
    for(var i=0;i<n;i++){tv.fromBufferAttribute(pa,ix?ix.getX(i):i).applyMatrix4(m.matrixWorld);tris.push(tv.x,tv.y,tv.z);if(i%3===0)two.push(ds);}
  });
  var nT=Math.floor(tris.length/9),SL=.5,slabs=new Map();
  for(var ti=0;ti<nT;ti++){
    var o9=ti*9,x0=Math.min(tris[o9],tris[o9+3],tris[o9+6]),x1=Math.max(tris[o9],tris[o9+3],tris[o9+6]);
    for(var sx=Math.floor(x0/SL);sx<=Math.floor(x1/SL);sx++){var bk=slabs.get(sx);if(!bk)slabs.set(sx,bk=[]);bk.push(o9);}
  }
  var out={props:props,tris:new Float32Array(tris)},rnd=dmgRand(1944);
  function hitTri(o9,ox,oy,oz,dx,dy,dz){
    var ax=tris[o9],ay=tris[o9+1],az=tris[o9+2],e1x=tris[o9+3]-ax,e1y=tris[o9+4]-ay,e1z=tris[o9+5]-az,e2x=tris[o9+6]-ax,e2y=tris[o9+7]-ay,e2z=tris[o9+8]-az;
    var px=dy*e2z-dz*e2y,py=dz*e2x-dx*e2z,pz=dx*e2y-dy*e2x,det=e1x*px+e1y*py+e1z*pz;if(Math.abs(det)<1e-12||(det<0&&!two[o9/9]))return -1;
    var inv=1/det,tx=ox-ax,ty=oy-ay,tz=oz-az,u=(tx*px+ty*py+tz*pz)*inv;if(u<0||u>1)return -1;
    var qx=ty*e1z-tz*e1y,qy=tz*e1x-tx*e1z,qz=tx*e1y-ty*e1x,w=(dx*qx+dy*qy+dz*qz)*inv;if(w<0||u+w>1)return -1;
    var t=(e2x*qx+e2y*qy+e2z*qz)*inv;return t>0?t:-1;
  }
  function cast(zone,o,d,maxZ){
    var bk=slabs.get(Math.floor(o.x/SL))||[],best=Infinity,bo=-1;
    for(var k=0;k<bk.length;k++){
      var t=hitTri(bk[k],o.x,o.y,o.z,d.x,d.y,d.z);if(t<0||t>=best)continue;
      if(maxZ>0&&Math.abs(o.z+d.z*t)>=maxZ)continue;
      best=t;bo=bk[k];
    }
    if(bo<0)return null;
    var e1=new THREE.Vector3(tris[bo+3]-tris[bo],tris[bo+4]-tris[bo+1],tris[bo+5]-tris[bo+2]),e2=new THREE.Vector3(tris[bo+6]-tris[bo],tris[bo+7]-tris[bo+1],tris[bo+8]-tris[bo+2]);
    var n=e1.cross(e2).normalize();if(n.dot(d)>0)n.negate();
    var s={p:o.clone().addScaledVector(d,best),n:n};(out[zone]=out[zone]||[]).push(s);return s;
  }
  Object.keys(DMG_ZONE_X).forEach(function(zone){
    var xr=DMG_ZONE_X[zone];
    for(var i=0;i<40;i++){
      var x=xr[0]+rnd()*(xr[1]-xr[0]),y=-3+rnd()*6,side=i%2?1:-1;
      /* fuselage only: the skin within 2.6 units of the centreline */
      if(i%5===4)cast(zone,new THREE.Vector3(x,40,(rnd()-.5)*1.2),new THREE.Vector3(0,-1,0),2.6);
      else cast(zone,new THREE.Vector3(x,y,side*60),new THREE.Vector3(0,0,-side),2.6);
    }
  });
  for(var f=0;f<30;f++){var sd=f%2?1:-1;cast('fin',new THREE.Vector3(-19.6+rnd()*3.4,.4+rnd()*4.2,sd*60),new THREE.Vector3(0,0,-sd));}
  if(props.length===4){
    ['left_wing','right_wing'].forEach(function(zone,wi){
      var a=props[wi?2:0],b=props[wi?3:1];
      for(var k=0;k<36;k++){
        var t=rnd()*1.25-.1,z=a.z+(b.z-a.z)*t,x=(a.x+(b.x-a.x)*t)-2.4-rnd()*5.6;
        cast(zone,new THREE.Vector3(x,40,z),new THREE.Vector3(0,-1,0));
      }
    });
  }
  var nm=holder.userData.nativeMatrix,ball=new THREE.Vector3(0,-.6,-5.3);
  if(nm)ball.applyMatrix4(new THREE.Matrix4().fromArray(nm));else ball.set(-1.0,0,0);
  out.belly=cast('belly',new THREE.Vector3(ball.x,-40,0),new THREE.Vector3(0,1,0));
  /* the openings crews bailed out through (bailout-exits.js) */
  out.exits={};
  var BX=window.KasselBailoutExits;
  if(BX)Object.keys(BX.EXITS).forEach(function(k){
    var e=BX.EXITS[k],hit=null;
    if(e.side==='belly')hit=cast('exit',new THREE.Vector3(e.x,-40,0),new THREE.Vector3(0,1,0));
    else if(e.side==='top')hit=cast('exit',new THREE.Vector3(e.x,40,0),new THREE.Vector3(0,-1,0),2.6);
    else if(e.side==='waist'){out.exits[k+'_L']=cast('exit',new THREE.Vector3(e.x,.6,-60),new THREE.Vector3(0,0,1),2.6);hit=cast('exit',new THREE.Vector3(e.x,.6,60),new THREE.Vector3(0,0,-1),2.6);}
    else hit={p:new THREE.Vector3(),n:new THREE.Vector3(0,-1,0)};
    if(hit)out.exits[k]=hit;
  });
  /* bomb bay length from the bay's two ends */
  out.bayLen=BX?Math.abs(BX.EXITS.bomb_bay_fwd.x-BX.EXITS.bomb_bay_aft.x)+.9:4.5;
  return V2._dmgSurf=out;
}
function dmgFlame(group,sh,pos,size,kind){
  /* a tongue of flame torn aft by the slipstream: a small hot root and a
     chain of cooler, redder lobes trailing back, not one glowing ball */
  var c=new THREE.Sprite(sh.core());c.position.copy(pos);c.scale.setScalar(size*.32);
  c.userData.flame={base:size*.32,phase:Math.random()*6.28,kind:'core'};group.add(c);
  for(var k=0;k<8;k++){
    var f=new THREE.Sprite(sh.flame());var t=k/7,sz=size*(.36+.3*Math.sin(t*2.6))*(1-t*.3);
    f.material.color.setRGB(1,.6-.34*t,.18-.14*t);f.material.opacity=.7-.45*t;
    f.position.copy(pos).add(new THREE.Vector3(-size*.21*k,size*(.03*k+.05*Math.sin(k*2.1)),size*.05*Math.cos(k*1.7)));f.scale.setScalar(sz);
    f.userData.flame={base:sz,phase:Math.random()*6.28,kind:kind||'fire'};group.add(f);
  }
}
/* nacelle aft end, behind the prop disc, in plane-local units */
function dmgNacelle(surf,i){var p=surf.props[i];return new THREE.Vector3(p.x-4.6,p.y+.35,p.z);}
function dmgFit(p,pd,D){
  var holder=null;p.children.forEach(function(ch){if(!holder&&ch.children&&ch.children.length)holder=ch;});
  if(!holder||p.userData.dmgFitFor===holder)return;
  p.userData.dmgFitFor=holder;
  var fit=D.fit(pd.pilot);
  holder.traverse(function(o){if(o.name==='km-ball-turret-exterior')o.visible=fit.ballTurret;});
  if(fit.h2xDome&&V2.templates&&V2.templates.b24lo){
    var surf=dmgSurface();if(!surf||!surf.belly)return;
    var sh=dmgShared(),dome=new THREE.Mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,Math.PI/2,Math.PI/2),sh.radome);
    /* AN/APS-15 radome in the former ball-turret well, lowered for the run */
    dome.scale.set(1.15,.62,.95);dome.position.copy(surf.belly.p).add(new THREE.Vector3(0,.12,0));dome.name='km-h2x-radome';
    holder.add(dome);
  }
}
/* how many damage features the skin shader can carry on this GPU */
function dmgMaxN(){
  if(V2._dmgN!==undefined)return V2._dmgN;
  var cap=KM._ren&&KM._ren.capabilities,fu=cap&&cap.maxFragmentUniforms||224;
  return V2._dmgN=Math.max(0,Math.min(32,Math.floor((fu-72)/2)));
}
/* give this ship its own skin materials carrying the damage shader */
function dmgPatchSkin(p,u){
  var VX=window.KasselDamageVisuals,N=dmgMaxN();
  if(!VX||N<8)return [];
  if(u.dmgSkinFor===u.dmgFitFor&&u.dmgSkin)return u.dmgSkin;
  u.dmgSkinFor=u.dmgFitFor;u.dmgSkin=[];
  p.updateMatrixWorld(true);
  var inv=new THREE.Matrix4().copy(p.matrixWorld).invert(),done=new Map();
  p.traverse(function(o){
    if(!o.isMesh||!o.material||Array.isArray(o.material)||o.material.transparent)return;
    for(var q=o;q&&q!==p;q=q.parent)if(q.name==='B-24J rotating propeller'||q.name==='km-ball-turret-exterior'||q.name==='km-damage'||q.name==='km-damage-interior')return;
    if(!o.material.isMeshStandardMaterial&&!o.material.isMeshPhongMaterial&&!o.material.isMeshLambertMaterial)return;
    var key=o.material,rel=new THREE.Matrix4().multiplyMatrices(inv,o.matrixWorld),mk=key.uuid+rel.elements.map(function(e){return e.toFixed(3);}).join();
    var m=done.get(mk);
    if(!m){m=VX.patchSkin(THREE,key,N,rel);done.set(mk,m);u.dmgSkin.push(m);}
    o.material=m;
  });
  return u.dmgSkin;
}
/* Bomb bay doors, nose-wheel doors and hatches standing open once a crewman
   has gone out through them: a clean cut in the skin (shader type 6) and
   the doors themselves. Plane-local units, belly normal -Y. */
function dmgOpenings(surf,open,g,sh){
  var out=[],X=surf.exits||{};if(!open)return out;
  function rect(at,hx,hz,axis){return {prio:11,type:6,c:at,r:hz,b:[axis,0,hx/hz],n:new THREE.Vector3(0,axis===1?(at.y<0?-1:1):0,0)};}
  function door(cx,cy,cz,sx,sy,sz,rx,rz){var m=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),sh.door);m.position.set(cx,cy,cz);m.rotation.set(rx||0,0,rz||0);m.userData.dmgOwn=true;g.add(m);}
  if(open.bomb_bay_doors&&X.bomb_bay_fwd&&X.bomb_bay_aft){
    var f=X.bomb_bay_fwd.p,a=X.bomb_bay_aft.p,mid=new THREE.Vector3((f.x+a.x)/2,Math.min(f.y,a.y),0),hx=(surf.bayLen||4.5)/2;
    out.push(rect(mid,hx,.62,1));
    /* the roller doors run up the outside of the fuselage on both sides */
    [-1,1].forEach(function(sd){door(mid.x,mid.y+.55,sd*1.43,hx*2,.62,.05,0,0);});
  }
  if(open.nose_wheel_doors&&X.nose_wheel){
    var nw=X.nose_wheel.p;out.push(rect(nw.clone(),.6,.36,1));
    [-1,1].forEach(function(sd){door(nw.x,nw.y-.2,sd*.42,1.15,.42,.03,sd*.35,0);});
  }
  /* the main entrance (camera) hatch is already modelled open, tunnel gun in it */
  if(open.top_hatch&&X.top_hatch)out.push(rect(X.top_hatch.p.clone(),.38,.3,1));
  return out;
}
V2.updateDamage=function(p,cue){
  var D=window.KasselAircraftDamage,VX=window.KasselDamageVisuals,pd=p.userData&&p.userData.planeData;
  if(!D||!pd||!V2.templates||!V2.templates.b24lo)return;
  dmgFit(p,pd,D);
  var u=p.userData;
  if(!u.dmgEvents)u.dmgEvents=D.schedule(pd.pilot,pd.fate,pd.fateTime);
  if(!u.dmgEvents.length&&!u.dmgOpen)return;
  var surf=dmgSurface();if(!surf||surf.props.length!==4)return;
  var st=D.stateAt(u.dmgEvents,cue);u.dmgState=st;var sig=Object.keys(u.dmgOpen||{}).join(',')+'|'+st.count+':'+st.engines.map(function(e){return (e.fire?1:0)+(e.dead?2:0)+(e.feathered?4:0);}).join('')+':'+Object.keys(st.fires).join(',');
  if(!u.dmgGroup||u.dmgGroup.parent!==p||u.dmgSig!==sig){
    if(u.dmgGroup&&u.dmgGroup.parent)u.dmgGroup.parent.remove(u.dmgGroup);
    if(u.dmgGroup)u.dmgGroup.traverse(function(o){if(o.isSprite)o.material.dispose();else if(o.isMesh&&o.userData.dmgOwn)o.geometry.dispose();});
    var g=new THREE.Group();g.name='km-damage';u.dmgGroup=g;u.dmgSig=sig;p.add(g);
    var sh=dmgShared();
    if(VX){
      /* torn skin, flak fields, soot and oil in the skin shader; petals and
         exposed structure as real geometry (aircraft-damage-visuals.js) */
      var L=VX.layout(surf,st,u.dmgEvents,cue,pd.pilot),open=dmgOpenings(surf,u.dmgOpen,g,sh);
      L.entries=open.concat(L.entries);
      var skin=L.entries.length?dmgPatchSkin(p,u):[];
      skin.forEach(function(m){VX.setEntries(m,L.entries);});
      var pg=VX.petalGeometry(THREE,L.petals.slice(0,48));
      if(pg){var pm=new THREE.Mesh(pg,sh.petal);pm.userData.dmgOwn=true;pm.name='km-damage-petals';g.add(pm);}
      var lg=VX.linerGeometry(THREE,surf.tris,L.entries.slice(0,dmgMaxN()));
      if(lg&&skin.length){var lm=new THREE.Mesh(lg,sh.liner);lm.userData.dmgOwn=true;lm.name='km-damage-liner';g.add(lm);}
      var bg=VX.barGeometry(THREE,L.bars);
      if(bg){var bm=new THREE.Mesh(bg,sh.structure);bm.userData.dmgOwn=true;bm.name='km-damage-structure';g.add(bm);}
    }
    st.engines.forEach(function(e,i){
      var nac=dmgNacelle(surf,i);
      if(e.fire)dmgFlame(g,sh,nac,2.3,'fire');
    });
    Object.keys(st.fires).forEach(function(zone){
      if(zone==='left_wing'||zone==='right_wing'){
        var a=surf.props[zone==='left_wing'?0:2],b=surf.props[zone==='left_wing'?1:3];
        for(var k=0;k<3;k++){var t=k/2;dmgFlame(g,sh,new THREE.Vector3((a.x+(b.x-a.x)*t)-5,a.y+.4,a.z+(b.z-a.z)*t),1.7-k*.15,'fire');}
        return;
      }
      /* compartment fire breaking out through the skin of that compartment */
      var skinPts=(surf[zone]||surf.bombbay||[]).filter(function(q){return q.n.y<.35;}),rf=dmgRand(KasselAircraftDamage.hash(zone+pd.pilot));
      for(var j=0;j<2&&skinPts.length;j++){var sp=skinPts[(rf()*skinPts.length)|0];dmgFlame(g,sh,sp.p.clone().addScaledVector(sp.n,.25),1.2-j*.2,'fire');}
    });
  }
  /* props: feathered blades stop edge-on; a dead unfeathered prop windmills */
  if(u.dmgPropFor!==u.dmgFitFor){
    u.dmgPropFor=u.dmgFitFor;u.dmgProps=[];
    p.traverse(function(o){if(o.name==='B-24J rotating propeller')u.dmgProps.push(o);});
    u.dmgProps.sort(function(a,b){return a.position.z-b.position.z;});
  }
  (u.dmgProps||[]).forEach(function(prop,i){
    var e=st.engines[i];if(!e)return;
    prop.visible=!e.missing;
    prop.traverse(function(o){
      if(!o.userData||!o.userData.isProp)return;
      o.userData.damageMode=e.feathered?'feathered':(e.dead||e.windmill)?'windmill':null;
      /* makeProp: hub first, blur disc last, blades between */
      var kids=o.children,last=kids.length-1;
      kids.forEach(function(bl,ki){
        if(ki===last)bl.visible=!o.userData.damageMode;
        else if(ki>0)bl.scale.x=o.userData.damageMode==='feathered'?.3:1;
      });
    });
  });
  /* flicker + world smoke/fire trails while playing */
  var t=KM._simSeconds||0,frame=V2._frame||0,emit=KM._playing;
  u.dmgGroup.children.forEach(function(o){
    var f=o.userData.flame;if(!f)return;
    var k=1+.22*Math.sin(t*17+f.phase)+.12*Math.sin(t*31+f.phase*2);
    o.scale.set(f.base*k,f.base*k*(f.kind==='core'?1:1.35),1);
  });
  if(emit&&p.visible){
    var w=new THREE.Vector3();
    st.engines.forEach(function(e,i){
      var age=e.age||0;
      if(e.fire&&(frame+i)%4===0&&KM._fire){w.copy(dmgNacelle(surf,i));p.localToWorld(w);emitPool(KM._fire,w.x,w.y,w.z);}
      if((e.fire||(e.dead&&age<40))&&(frame+i*3)%9===0&&KM._smoke){w.copy(dmgNacelle(surf,i)).x-=3;p.localToWorld(w);emitPool(KM._smoke,w.x,w.y,w.z);}
    });
    if(Object.keys(st.fires).length&&frame%6===0&&KM._smoke){w.set(-2,0,0);p.localToWorld(w);emitPool(KM._smoke,w.x,w.y,w.z);}
  }
  V2.updateInteriorDamage(p,st);
};
/* the crew view of the same damage */
function dmgSectionAt(yb){
  if(yb>1.5)return {a:.92,zc:.24,b:1.18,n:3,zone:'nose'};
  if(yb>-0.95)return {a:1.0,zc:.85,b:.85,n:3,zone:'flightdeck'};
  if(yb>-3)return {a:1.0,zc:.84,b:.84,n:3,zone:'bombbay'};
  if(yb>-11.2)return {a:.9,zc:.42,b:1.3,n:3.2,zone:'waist'};
  return {a:.52,zc:.62,b:.62,n:3,zone:'tail'};
}
var DMG_ZONE_YB={nose:[1.7,3.4],flightdeck:[-.8,1.2],bombbay:[-2.8,-1.1],waist:[-10.6,-6.4],tail:[-14.1,-12.7]};
V2.updateInteriorDamage=function(p,st){
  var c=KM._camState,cc=window.KasselCrewCompartments,D=window.KasselAircraftDamage,u=p.userData;
  var active=c&&c.mode==='crew'&&c._intFor===p&&cc&&cc.toUnits;
  var station=active?c.crewPos:null;
  if(!active||!st){if(u.dmgInterior&&u.dmgInterior.parent)u.dmgInterior.parent.remove(u.dmgInterior);u.dmgInterior=null;return;}
  var zones=D.STATION_ZONES[station]||[],sig=station+'|'+st.count+'|'+Object.keys(st.fires).join(',');
  if(!u.dmgInterior||u.dmgInterior.parent!==p||u.dmgInteriorSig!==sig){
    if(u.dmgInterior&&u.dmgInterior.parent)u.dmgInterior.parent.remove(u.dmgInterior);
    if(u.dmgInterior)u.dmgInterior.traverse(function(o){if(o.isSprite)o.material.dispose();else if(o.isMesh&&o.userData.dmgOwn)o.geometry.dispose();});
    var g=new THREE.Group();g.name='km-damage-interior';u.dmgInterior=g;u.dmgInteriorSig=sig;p.add(g);
    var sh=dmgShared(),M=cc.metresPerModelUnit||(20.47/33);
    function local(xm,zb,yb){var v=cc.toUnits([xm,zb,-yb]);return new THREE.Vector3(v[0],v[1],v[2]);}
    st.holes.forEach(function(h){
      if(zones.indexOf(h.zone)<0)return;
      var yr=DMG_ZONE_YB[h.zone],rnd=dmgRand(h.seed^0x5bd1e995),n=h.big?4:7;
      for(var i=0;i<n+(h.big?1:0);i++){
        var yb=yr[0]+rnd()*(yr[1]-yr[0]),sec=dmgSectionAt(yb),side=rnd()<.5?-1:1,zb=sec.zc-sec.b*.55+rnd()*sec.b*1.35;
        var tz=Math.min(1,Math.abs((zb-sec.zc)/sec.b)),xm=side*sec.a*Math.pow(1-Math.pow(tz,sec.n),1/sec.n)*.985;
        var pos=local(xm,zb,yb),inward=local(xm-side*.3,zb,yb).sub(pos).normalize();
        var r=(i===n&&h.big)?.42/M:(.035+rnd()*.06)/M;
        var m=sh.daylightRagged?new THREE.Mesh(sh.holeQuads[i%4],sh.daylightRagged):new THREE.Mesh(sh.holeGeos[i%3],sh.daylight);
        m.scale.setScalar(sh.daylightRagged?r*1.6:r);m.position.copy(pos);m.lookAt(pos.clone().add(inward));m.rotateZ(rnd()*6.28);g.add(m);
        /* skin torn inward round the hole, catching the light */
        if(window.KasselDamageVisuals&&r*M>.05){var pg2=window.KasselDamageVisuals.petalGeometry(THREE,[{p:pos,n:local(xm+side*.3,zb,yb).sub(pos).normalize(),r:r,out:false,seed:(rnd()*1e9)|0,big:i===n&&h.big}]);
          if(pg2){var pm2=new THREE.Mesh(pg2,sh.petal);pm2.userData.dmgOwn=true;g.add(pm2);}}
        var beam=new THREE.Mesh(sh.beamGeo,sh.beam);beam.scale.set(r,r,(1.1+rnd()*.6)/M);beam.position.copy(pos);beam.lookAt(pos.clone().add(inward));g.add(beam);
      }
    });
    var seat=V2.DETAIL_SEATS&&V2.DETAIL_SEATS[station];
    zones.forEach(function(z){
      var glass=st.glass[z];if(!glass||!seat)return;
      var eye=new THREE.Vector3(seat.offset.x,seat.offset.y,seat.offset.z),look=new THREE.Vector3(seat.look.x,seat.look.y,seat.look.z).normalize();
      var right=new THREE.Vector3().crossVectors(look,new THREE.Vector3(0,1,0)).normalize(),rnd=dmgRand(glass.seed);
      for(var k=0;k<2;k++){
        var q=new THREE.Mesh(new THREE.PlaneGeometry(1,1),sh.crack);q.scale.setScalar((.34+rnd()*.14)/M);
        q.position.copy(eye).addScaledVector(look,.55/M).addScaledVector(right,(k?-.22:.18)/M).add(new THREE.Vector3(0,(.06-k*.1)/M,0));
        q.lookAt(eye);q.rotateZ(rnd()*6.28);g.add(q);
      }
    });
    var fire=zones.filter(function(z){return st.fires[z];})[0],smoky=fire||zones.some(function(z){return st.damaged[z];})||
      (zones.indexOf('flightdeck')>=0&&st.engines.some(function(e){return e.fire;}));
    if(fire){var yr2=DMG_ZONE_YB[fire];for(var f=0;f<3;f++)dmgFlame(g,sh,local((f-1)*.25,.15,yr2[0]+.4+f*.2),.6/M,'fire');}
    if(smoky){
      var rs=dmgRand(st.count*7919+(fire?1:0)),yz=DMG_ZONE_YB[zones[0]];
      for(var s2=0;s2<(fire?18:9);s2++){
        var sp=new THREE.Sprite(sh.smoke());sp.material.opacity=fire?.3:.16;
        var yb2=yz[0]+rs()*(yz[1]-yz[0]);sp.position.copy(local((rs()-.5)*1.4,.3+rs()*1.2,yb2));
        sp.scale.setScalar((.7+rs()*.9)/M);sp.userData.drift={x:sp.position.x,y:sp.position.y,ph:rs()*6.28};g.add(sp);
      }
    }
  }
  var tt=KM._simSeconds||0;
  u.dmgInterior.children.forEach(function(o){
    var f=o.userData.flame,d=o.userData.drift;
    if(f){var k=1+.25*Math.sin(tt*15+f.phase);o.scale.set(f.base*k,f.base*k*1.4,1);}
    if(d){o.position.x=d.x-((tt*1.3+d.ph*3)%6)+3;o.position.y=d.y+.2*Math.sin(tt*.7+d.ph);}
  });
};

/* live flight-deck instruments and controls (cockpit-live.js) for the
   ship whose crew view is open; readings follow its flight and damage */
/* One aircraft's own altitude and airspeed: the mission profile while it
   flies with the group, and, once it is hit and falling, its height above
   the ground in the same ratio as the formation's (the scene's vertical
   scale is not literal), with airspeed building in the dive. */
V2.planeFlight=function(p){
  var u=p.userData,mt=KM._missionT||0,ph=KM._missionPhases||{},keys=Object.keys(ph),cur=null,nxt=null;
  keys.forEach(function(k,i){if(mt>=ph[k].start){cur=ph[k];nxt=ph[keys[i+1]]||ph[k];}});
  if(!cur)return null;
  var span=Math.max(1e-6,(nxt.start||1)-cur.start),f=nxt===cur?0:Math.max(0,Math.min(1,(mt-cur.start)/span));
  var alt=cur.alt+(nxt.alt-cur.alt)*f,ias=cur.spd+(nxt.spd-cur.spd)*f;
  p.updateMatrixWorld(true);
  var e=p.matrixWorld.elements,fw=new THREE.Vector3(e[0],e[1],e[2]).normalize(),rt=new THREE.Vector3(e[8],e[9],e[10]).normalize();
  var heading=(Math.atan2(fw.x,-fw.z)/Math.PI*180+360)%360,bank=Math.asin(Math.max(-1,Math.min(1,-rt.y))),pitch=Math.asin(Math.max(-1,Math.min(1,fw.y)));
  var falling=u.alive===false,wp=new THREE.Vector3().setFromMatrixPosition(p.matrixWorld),ay=KM._anchor&&KM._anchor.pos?KM._anchor.pos.y:wp.y;
  if(falling){
    var GROUND_FT=800,gy=V2.groundAt?V2.groundAt(wp.x,wp.z):0;if(!isFinite(gy))gy=0;
    var gay=V2.groundAt&&KM._anchor?V2.groundAt(KM._anchor.pos.x,KM._anchor.pos.z):gy;if(!isFinite(gay))gay=gy;
    var frac=Math.max(0,Math.min(1.05,(wp.y-gy)/Math.max(1e-3,ay-gay)));
    alt=GROUND_FT+(alt-GROUND_FT)*frac;
    ias=Math.max(110,Math.min(340,ias+150*Math.max(0,-Math.sin(pitch))+30));
  }
  return {alt:alt,ias:ias,heading:heading,bank:bank,pitch:pitch,falling:falling,cur:cur,nxt:nxt,mt:mt};
};
V2.updateCockpit=function(p){
  var c=KM._camState,L=window.KasselCockpitLive;
  if(!L||!c||c.mode!=='crew'||c._intFor!==p)return;
  var cabin=Array.isArray(V2._intActive)?V2._intActive[0]:V2._intActive;if(!cabin)return;
  var fl=V2.planeFlight(p);if(!fl)return;
  var u=p.userData,mt=fl.mt,cur=fl.cur,nxt=fl.nxt,alt=fl.alt,ias=fl.ias,heading=fl.heading,bank=fl.bank,pitch=fl.pitch,falling=fl.falling;
  var t=KM._simSeconds||0,now=KM._playbackSeconds||0,dt=Math.max(1e-3,now-(u.ckT||now-0.016));
  var bankRate=u.ckBank===undefined?0:(bank-u.ckBank)/dt,pitchRate=u.ckPitch===undefined?0:(pitch-u.ckPitch)/dt;
  u.ckT=now;u.ckBank=bank;u.ckPitch=pitch;
  var vsi=falling?-Math.min(9000,3000+Math.abs(pitch)*9000):(nxt.alt>cur.alt+50?450:nxt.alt<cur.alt-50?-500:0);
  var clk=String(KMMissionTimeline.clockAt(mt)).split(':');
  var st=u.dmgState,battle=KM._battleT>0&&mt<RETURN_START;
  var engines=[0,1,2,3].map(function(i){
    var d=st?st.engines[i]:{};
    if(d.missing||d.feathered)return {rpm:0,map:12.3,oilT:38,oilP:0,cht:90,dead:true,throttle:0};
    if(d.dead)return {rpm:900,map:12.3,oilT:52,oilP:20,cht:130,dead:true,throttle:0};
    return {rpm:battle?2550:2300,map:battle?40:33,oilT:d.fire?96:72,oilP:d.fire?45:82,cht:d.fire?285:205,dead:false,throttle:battle?.95:.8};
  });
  var deadL=(engines[0].dead?1:0)+(engines[1].dead?1:0),deadR=(engines[2].dead?1:0)+(engines[3].dead?1:0);
  var hydOut=false;(u.dmgEvents||[]).forEach(function(ev){if(ev.kind==='hydraulics_out'&&(KM._battleT||0)>=ev.at)hydOut=true;});
  var shake=battle?.06:.015;
  var s={altFt:alt,ias:ias,heading:heading,bank:bank,pitch:pitch,vsi:vsi,
    turnRate:ias>10?(1091*Math.tan(bank)/(ias*.869)):0,slip:(deadL-deadR)*.12,
    clockHr:+clk[0]||0,clockMin:+clk[1]||0,engines:engines,
    hyd:hydOut?0:1000,oat:15-1.98*alt/1000,carb:18,suction:4,amps:falling?20:62,fuel:Math.max(.1,1-mt*.85),
    aileron:Math.max(-1,Math.min(1,bankRate*.9+bank*.35+shake*Math.sin(t*2.3)+(deadL-deadR)*-.08)),
    elevator:Math.max(-1,Math.min(1,pitchRate*1.2+shake*Math.sin(t*1.7+1)+(falling?.6:0))),
    rudder:Math.max(-1,Math.min(1,(deadL-deadR)*.4+shake*.5*Math.sin(t*1.3+2)))};
  L.apply(THREE,cabin,s);
};

/* ---------- plane placement per frame ---------- */
function placePlane(p,battleT,elapsed,scene,dt,bombRelease,bombIndex){
  /* Losses must continue after the attack clock caps at 420 seconds. */
  battleT=KMMissionTimeline.battleCueAtPlayback(KM._playbackSeconds||0);
  var v=p.userData.v2,a=KM._anchor;
  if(V2.updateDamage)V2.updateDamage(p,battleT);
  if(V2.updateCockpit)V2.updateCockpit(p);
  var off=p.userData.offset||{x:0,y:0,z:0};
  /* The plane's measured mesh bounds determine its map scale, not an
     arbitrary magnification that makes wings cross formation slots. */
  var mapMetres=111195*Math.cos(51.4*Math.PI/180)*(GEO.xToLon(1)-GEO.xToLon(0));
  KasselAircraftMapScale.fit(THREE,p,110*.3048,mapMetres);
  if(KM._fpCenterX===undefined){var _sx=0,_n=1;(KM._fp||[]).forEach(function(q){var o=q.userData.offset;if(o){_sx+=o.x;_n++;}});KM._fpCenterX=_sx/_n;}
  var _cx=KM._fpCenterX||0;  /* recentre the whole box so turns pivot about the MIDDLE, not the lead */
  var ph=p.userData.basePhase||0;
  /* formation position in track frame */
  var across=new THREE.Vector3(-a.dir.z,0,a.dir.x);
  /* on the way home the survivors fly LOOSE — shot up, straggling,
     altitude scattered. No parade-ground box after that fight. */
  var ret=KM._missionT>=RETURN_START?Math.min(1,(KM._missionT-RETURN_START)*25):0;
  var spread=1+ret*0.55;
  var straggle=ret*((hash('rg'+(p.userData.planeData?p.userData.planeData.rel:ph))%100)/100);
  /* touchdown settle: once parked in the post-landing hold, kill the
     perpetual sine-wave jitter and pull the loose straggle/spread back
     toward a calm parked line, so landed ships visibly stop bouncing
     instead of hovering and wobbling forever. */
  function landingEnvelope(mt){var u=Math.max(0,Math.min(1,(mt-.975)/.025));return u*u*(3-2*u);}
  var jit=1-landingEnvelope(KM._missionT);
  spread=1+(spread-1)*jit;
  straggle*=jit;
  function formPos(out,atMission){
    /* Explicit historical samples must derive their own formation
       state, not inherit the viewer's present return/landing state. */
    var sampleRet=atMission===undefined?ret:(atMission>=RETURN_START?Math.min(1,(atMission-RETURN_START)*25):0);
    var sampleMission=atMission===undefined?a._mt:atMission;
    var sampleLanding=landingEnvelope(sampleMission);
    var sampleSpread=1+sampleRet*.55*(1-sampleLanding);
    var sampleStraggle=sampleRet*((hash('rg'+(p.userData.planeData?p.userData.planeData.rel:ph))%100)/100)*(1-sampleLanding);
    /* Separate axis scales keep the compact-box geometry without
       putting three-unit rendered wingspans only inches apart. */
    var _fsAlong=KM._fsAlong||0.24;
    var _fsLat=KM._fsLat||0.28;
    var _fsVert=KM._fsVert||0.22;
    var _alng=(off.x-_cx)*sampleSpread*_fsAlong-sampleStraggle*34;
    var _F=KM._full;
    if(!_F){
      out.set(
        a.pos.x+a.dir.x*_alng+across.x*off.z*spread*_fsLat+Math.sin(elapsed*0.42+ph)*(0.08+ret*0.22)*jit,
        a.pos.y+off.y*spread*_fsVert+straggle*7-ret*3+Math.sin(elapsed*0.36+ph)*(0.05+ret*0.15)*jit,
        a.pos.z+a.dir.z*_alng+across.z*off.z*spread*_fsLat+Math.cos(elapsed*0.39+ph)*(0.08+ret*0.22)*jit);
      p.userData._lh=undefined; return;
    }
    var _fL=_F.__len||(_F.__len=_F.getLength());
    /* Metre-based slot dimensions from the corrected formation model.
       Four metres per diagram unit is ESTIMATED, not surveyed spacing.
       Keep the geographic map projection separate from slot dimensions. */
    var _mx=111195*Math.cos(51.4*Math.PI/180)*(GEO.xToLon(1)-GEO.xToLon(0));
    var _mz=111195*(GEO.zToLat(0)-GEO.zToLat(1));
    var _my=7010/115;
    function physicalPath(s){
      var f=s/_mx/_fL,t=Math.max(0,Math.min(1,f)),q=_F.getPointAt(t);
      /* Extend endpoint tangents: clamping trailing slots would collapse
         the box at takeoff/landing and erase their forward velocity. */
      if(f!==t)q.addScaledVector(_F.getTangentAt(t), (f-t)*_fL);
      return [q.x*_mx,(q.y+8)*_my,q.z*_mz];
    }
    var state=KasselFormationKinematics.sample(physicalPath,
      fullArc(atMission===undefined?a._mt:atMission)*_mx,V2.nominalTASMps||105,
      {alongM:(off.x-_cx)*4*sampleSpread-sampleStraggle*120,
       lateralM:off.z*4*sampleSpread,verticalM:off.y*(30.48/14)*sampleSpread});
    out.set(state.positionM[0]/_mx,state.positionM[1]/_my,state.positionM[2]/_mz);
    var velocity=new THREE.Vector3(state.velocityMps[0]/_mx,state.velocityMps[1]/_my,state.velocityMps[2]/_mz);
    if(sampleLanding>0){
      var ground=(V2.groundAt&&V2.groundAt(out.x,out.z))??Math.max(.6,V2.demReady?V2.elevAt(out.x,out.z)*ELEV_SCALE:.6);
      var support=KasselAircraftMapScale.supportDepth(p),targetY=ground+support;
      var eps=.000001,arcDelta=(fullArc(sampleMission+eps)-fullArc(sampleMission-eps))*_mx;
      var landSlope=arcDelta>1e-9?(landingEnvelope(sampleMission+eps)-landingEnvelope(sampleMission-eps))/arcDelta:0;
      velocity.y=velocity.y*(1-sampleLanding)+(targetY-out.y)*landSlope*(V2.nominalTASMps||105);
      if(sampleLanding===1)velocity.y=0;
      out.y=out.y*(1-sampleLanding)+targetY*sampleLanding;
    }
    p.userData._lh=Math.atan2(-velocity.x,-velocity.z);
    p.userData._formationVelocity=velocity;
    p.userData._formationBank=state.coordinatedBankRad*(1-sampleLanding);
  }
  var beh=v.beh,ft=v.ft;
  if(bombRelease!==undefined)queueBombs(scene,p,bombIndex,bombRelease,formPos);
  var active=ft!=null&&battleT>=ft&&beh!=='stay';
  if(!active){
    p.visible=true;p.userData.alive=true;
    var _ps=p.userData.mapGeometryScale||(KM._ps||0.09);
    if(Math.abs((p.scale.x||0)-_ps)>1e-6)p.scale.setScalar(_ps);
    var _tgt=p.userData._tgt||(p.userData._tgt=new THREE.Vector3());
    formPos(_tgt);
    /* Place reconstruction state exactly. Render easing and elapsed-time
       bobbing caused frame-rate-dependent drift and a discontinuity when
       the same aircraft began its deterministic loss trajectory. */
    p.position.copy(_tgt);p.userData._fpInit=true;
    /* the whole box shares the lead's heading — always pointing forward,
       stable. It pivots about its CENTRE (see _cx) so it no longer swings
       around the front ship. */
    p.rotation.order='YZX';
    var _hd=(p.userData._lh!==undefined)?p.userData._lh:a.heading;
    if(p.userData._formationVelocity)KasselFlightAttitude.apply(THREE,p,p.userData._formationVelocity,p.userData._formationBank);
    else p.rotation.set(a.roll,_hd+Math.PI/2,0);
    /* battle damage (smoke from the recorded engines) is drawn by
       V2.updateDamage from the crew accounts, not picked by slot */
    return;
  }
  p.userData.alive=false;
  if(beh==='fall'){
    if(!v.startPos){
      var lossMission=BATTLE_START+ft/BATTLE_SPAN*BATTLE_FRAC;
      v.startPos=new THREE.Vector3();formPos(v.startPos,lossMission);
      /* A timeline scrub reconstructs state; it must not create a fatal
         hit flash and freeze that giant sprite over the aircraft. */
      if(KM._playing&&(battleT-ft)<2.5)killFlash(scene,v.startPos,4*(p.userData.mapGeometryScale||p.scale.x));
      v.chutesOut=0;v.bailoutSchedule=null;p.userData.dmgOpen=null;
      /* carry the formation's momentum into the fall — the ship keeps
         flying forward as it noses over, curving toward where it fell */
      v.fwd=KM._anchor.dir.clone();
      if(KM._full){
        var lossArc=fullArc(lossMission)/(KM._full.__len||KM._full.getLength());
        v.fwd.copy(KM._full.getTangentAt(Math.max(0,Math.min(0.999,lossArc))));
        v.fwd.y=0;v.fwd.normalize();
      }
      var s0=v.sitePos||v.startPos.clone().setY(2);
      if(v.sitePos&&V2.groundAt)s0.y=V2.groundAt(s0.x,s0.z)??s0.y;
      /* Match the per-aircraft authored formation velocity in the SAME
         legacy cue units as u=(battleT-ft)/dur. Do not derive momentum
         from crash-site distance or instantly prescribe a descent pitch.
         This is kinematic continuity, not an SI aerodynamic model. */
      var cueStep=.001,missionStep=cueStep*BATTLE_FRAC/BATTLE_SPAN;
      var priorPos=new THREE.Vector3(),nextPos=new THREE.Vector3();
      formPos(priorPos,lossMission-missionStep);formPos(nextPos,lossMission+missionStep);
      var entryVelocity=nextPos.sub(priorPos).multiplyScalar(1/(2*cueStep));
      if(v.sitePos){
        var metricScale={x:111195*Math.cos(51.4*Math.PI/180)*(GEO.xToLon(1)-GEO.xToLon(0)),
          y:7010/115,z:111195*(GEO.zToLat(0)-GEO.zToLat(1))};
        v.forwardRoute=KasselForwardEndpointRoute.build(v.startPos,entryVelocity,v.sitePos,metricScale,2500);
        v.forwardRoute.initialBank=p.userData._formationBank||0;
        v.forwardRoute.terrainHeight=V2.groundAt;
        if(v.pilot==='Miner'){
          v.profile=V2.LOSS_PROFILES.Miner;
          // The interview gives an approximate altitude at the decision
          // to leave. It gives event order, not elapsed seconds.
          var recalledAltitude=10000*.3048/metricScale.y;
          if(v.startPos.y>recalledAltitude&&s0.y<recalledAltitude){
            var high=0,low=1;
            for(var step=0;step<24;step++){
              var middle=(high+low)/2;
              if(KasselForwardEndpointRoute.sample(v.forwardRoute,middle).position.y>recalledAltitude)high=middle;
              else low=middle;
            }
            var phase=(high+low)/2,remaining=1-phase;
            v.profile=Object.assign({},v.profile,{
              spinStart:phase+Math.min(.01,remaining*.25),
              pilotExitPhase:phase+Math.min(.025,remaining*.50)
            });
          }
        }
        v.dur=v.forwardRoute.length/Math.max(.001,Math.hypot(entryVelocity.x*metricScale.x,entryVelocity.z*metricScale.z));
        KM._playbackEndSeconds=Math.max(KM._playbackEndSeconds||300,KMMissionTimeline.playbackAtBattleCue(ft+v.dur)+2);
        v.routeClassification='ESTIMATED';
      }
      var momentum=KasselLossTrajectory.momentumControl(v.startPos,entryVelocity,v.dur);
      v.ctrl=new THREE.Vector3(momentum.x,momentum.y,momentum.z);
      /* A mortally damaged B-24 must leave its occupied formation slot
         before descending through the box.  Send it immediately toward
         the OUTSIDE of its squadron, never through the formation centre. */
      var escapeSide=off.z===0?((v.seed&1)?1:-1):(off.z>0?1:-1);
      v.escapeAcross=new THREE.Vector3(-v.fwd.z,0,v.fwd.x).multiplyScalar(escapeSide);
      v.escapeAlong=((v.seed%7)-3)*0.9;
      v.escapeAmt=9+(v.seed%5)*2.2;
      /* Clearance is introduced by the smooth escape envelope, not by
         rotating the initial Bezier velocity sideways at the hit. */
    }
    var u=(battleT-ft)/v.dur;
    if(v.profile&&v.profile.event!=null&&!v.devastated&&u>=v.profile.event){
      v.devastated=true;
      if(KM._playing)spawnDevastation(scene,KasselLossTrajectory.sample(v,v.profile.event).position,
        v.profile,v.seed,v.fwd,p.userData.mapGeometryScale||p.scale.x);
    }
    /* the POW survivors bail out on the way down */
    var pd2=p.userData.planeData;
    var bailout=v.bailoutCrew||[];
    var nCh=bailout.length;
    if(nCh>0&&v.chutesOut<nCh&&u>=0.08){
      if(!v.bailoutSchedule){
        /* who goes out which opening, and in what order: the AAF bail-out
           poster, overridden where a crew account names the exit
           (bailout-exits.js). The pilot leaves last. */
        var BX=window.KasselBailoutExits,plans=BX?BX.plan(v.pilot,bailout,V2.CREW_LISTS&&V2.CREW_LISTS[v.pilot]):null;
        var rankOf=bailout.map(function(member,index){
          var pl=plans&&plans[index],isPilot=/^(pilot|command pilot)$/i.test(member.r||'');
          return {index:index,pilot:isPilot,plan:pl,key:(isPilot?100:0)+(pl?pl.order:index)+index*.01};
        }).sort(function(a,b){return a.key-b.key;});
        v.bailoutSchedule=rankOf.map(function(e,k){
          var phase=e.pilot&&v.pilot==='Miner'?v.profile.pilotExitPhase:0.08+0.34*k/Math.max(1,nCh-1);
          return {index:e.index,phase:phase,pilot:e.pilot&&v.pilot==='Miner',plan:e.plan};
        }).sort(function(a,b){return a.phase-b.phase;});
        pd2.bailoutPlans=plans;
      }
      while(v.chutesOut<nCh){
        var event=v.bailoutSchedule[v.chutesOut],ci=event.index,bu=event.phase;
        if(u<bu)break;
        var launchPose=KasselLossTrajectory.sample(v,bu).position;
        var launch=new THREE.Vector3(launchPose.x,launchPose.y,launchPose.z);
        /* leave from the right opening on the model, and show it open */
        if(event.plan)launch=bailoutExitPoint(p,v,bu,event.plan,bailout[ci])||launch;
        var du=.0001,ua=Math.max(0,bu-du),ub=Math.min(1,bu+du);
        var pa=KasselLossTrajectory.sample(v,ua).position,pb=KasselLossTrajectory.sample(v,ub).position;
        var ta=KMMissionTimeline.playbackAtBattleCue(ft+ua*v.dur),tb=KMMissionTimeline.playbackAtBattleCue(ft+ub*v.dur);
        var momentum=tb>ta?{x:(pb.x-pa.x)/(tb-ta),z:(pb.z-pa.z)/(tb-ta)}:null;
        /* His account establishes delayed deployment, not a measured
           duration. 0.65 playback seconds is presentation-only. */
        var openingDelay=event.pilot?.65:0;
        spawnChute(scene,launch,bailout[ci],pd2,ci,ft+bu*v.dur,momentum,openingDelay,mapMetres);
        v.chutesOut++;
      }
    }
    if(u>=1){
      p.visible=false;
      if(v.sitePos)addColumn(scene,v.sitePos,v.pilot);
      return;
    }
    p.visible=true;
    var lossPose=KasselLossTrajectory.pose(v,u);
    var x=lossPose.position.x,y=lossPose.position.y,z=lossPose.position.z;
    /* No frame-order-dependent shoves. Clearance is tested using model
       bounds separately, not fabricated corrections to loss geography. */
    p.position.set(x,y,z);
    /* Include the lateral escape and authored spiral in the tangent;
       the old heading differentiated only the underlying Bezier. */
    KasselFlightAttitude.apply(THREE,p,lossPose.tangent,lossPose.bank);
    KasselAircraftMapScale.clearTerrain(THREE,p,V2.groundAt);
    /* burning trail */
    if(KM._playing&&(V2._frame&1)===0){
      if((V2._frame&3)===0)emitPool(KM._fire,x,y,z);
    }
  }else{ /* exits */
    if(!v.startPos){
      /* Reconstruct the departure at its authored cue, not wherever
         the formation happens to be when a viewer seeks forward. */
      var exitMission=BATTLE_START+ft/BATTLE_SPAN*BATTLE_FRAC;
      v.startPos=new THREE.Vector3();formPos(v.startPos,exitMission);
      var tgt=v.sitePos?v.sitePos.clone():v.startPos.clone();
      var destinationGround=V2.groundAt&&V2.groundAt(tgt.x,tgt.z);
      var support=KasselAircraftMapScale.supportDepth(p);
      if(destinationGround!==undefined)tgt.y=destinationGround+support;
      var exitStep=.001,exitMissionStep=exitStep*BATTLE_FRAC/BATTLE_SPAN;
      var exitPrior=new THREE.Vector3(),exitNext=new THREE.Vector3();
      formPos(exitPrior,exitMission-exitMissionStep);formPos(exitNext,exitMission+exitMissionStep);
      var exitVelocity=exitNext.sub(exitPrior).multiplyScalar(1/(2*exitStep));
      var exitScale={x:111195*Math.cos(51.4*Math.PI/180)*(GEO.xToLon(1)-GEO.xToLon(0)),y:7010/115,
        z:111195*(GEO.zToLat(0)-GEO.zToLat(1))};
      v.departureRoute=KasselForwardEndpointRoute.build(v.startPos,exitVelocity,tgt,exitScale,2500);
      v.departureRoute.initialBank=p.userData._formationBank||0;
      if(V2.groundAt)v.departureRoute.terrainHeight=function(x,z){
        var ground=V2.groundAt(x,z);return ground===undefined?undefined:ground+support;
      };
      v.exitDuration=v.departureRoute.length/Math.max(.001,Math.hypot(exitVelocity.x*exitScale.x,exitVelocity.z*exitScale.z));
      KM._playbackEndSeconds=Math.max(KM._playbackEndSeconds||300,KMMissionTimeline.playbackAtBattleCue(ft+v.exitDuration+9)+2);
      v.routeClassification='ESTIMATED';
    }
    /* the exit clock keeps running into the return phase — battleT
       stops at 420, which froze the England-bound ships (Dewey,
       Hunter…) in mid-air halfway home */
    var exClock=battleT-ft;
    var travelled=exClock;
    var lim=v.exitDuration;
    var siteY=v.sitePos?Math.max(v.sitePos.y,2):2;
    if(travelled>=lim){
      /* YOU SEE THEM ARRIVE: the ship sits on the ground at its real
         landing site for a few beats before the marker takes over */
      if(p.visible&&v.pilot)V2.revealCrash(scene,v.pilot);
      var landT=exClock-lim;
      if(landT>9){p.visible=false;return;}
      p.visible=true;
      var arrival=KasselForwardEndpointRoute.sample(v.departureRoute,1);
      p.position.set(arrival.position.x,arrival.position.y,arrival.position.z);
      KasselFlightAttitude.apply(THREE,p,arrival.tangent,0);
      return;
    }
    p.visible=true;
    /* Authored descent interpolation, not a validated landing model. */
    var prog=travelled/lim;
    var departurePose=KasselForwardEndpointRoute.sample(v.departureRoute,prog);
    p.position.set(departurePose.position.x,departurePose.position.y,departurePose.position.z);
    KasselFlightAttitude.apply(THREE,p,departurePose.tangent,departurePose.bank);
    KasselAircraftMapScale.clearTerrain(THREE,p,V2.groundAt);
    if(KM._playing&&(V2._frame&3)===0)emitPool(KM._smoke,p.position.x-2,p.position.y,p.position.z);
  }
}

/* ---------- fighters — Sturmgruppe company-front passes from astern ----------
   Each wave stays a coherent line abreast on the bomber box's altitude
   plane, makes ONE firing pass, then breaks ahead and disappears. */
function waveTime(w,i){return w.t!=null?w.t:60+i*45;}
// Monotone Hermite coordinate through the existing attack landmarks.
// Shared derivatives make position AND velocity continuous at the breaks.
// Scene-unit path reconstruction only: not a force-integrated manoeuvre.
function fighterPassCoordinate(ph,values){
  var knots=[0,.70,.88,1],slopes=[],derivatives=[];
  for(var n=0;n<3;n++)slopes[n]=(values[n+1]-values[n])/(knots[n+1]-knots[n]);
  derivatives[0]=slopes[0];derivatives[3]=slopes[2];
  for(var n=1;n<3;n++){
    var left=slopes[n-1],right=slopes[n];
    var hLeft=knots[n]-knots[n-1],hRight=knots[n+1]-knots[n];
    var w1=2*hRight+hLeft,w2=hRight+2*hLeft;
    derivatives[n]=left*right<=0?0:(w1+w2)/(w1/left+w2/right);
  }
  var segment=ph<.70?0:ph<.88?1:2,h=knots[segment+1]-knots[segment];
  var u=(ph-knots[segment])/h,u2=u*u,u3=u2*u;
  var a=values[segment],b=values[segment+1],ma=derivatives[segment],mb=derivatives[segment+1];
  return {value:(2*u3-3*u2+1)*a+(u3-2*u2+u)*h*ma+(-2*u3+3*u2)*b+(u3-u2)*h*mb,
    derivative:((6*u2-6*u)*a+(-6*u2+6*u)*b)/h+(3*u2-4*u+1)*ma+(3*u2-2*u)*mb};
}
function updateFighters(battleT,dt,elapsed,scene){
  var a=KM._anchor;
  var across=new THREE.Vector3(-a.dir.z,0,a.dir.x);
  var bombers=(KM._fp||[]).concat(KM._b24?[KM._b24]:[]).filter(function(b){return b.visible&&b.userData.alive;});
  (KM._fighterWaves||[]).forEach(function(w,wi){
    var t0=waveTime(w,wi);
    var waveDur=w.duration||90;
    var act=battleT>=t0&&battleT<t0+waveDur;
    (w.models||[]).forEach(function(f,fi){
      if(!act){f.visible=false;return;}
      f.visible=true;
      if(f.children.length)KasselAircraftMapScale.fit(THREE,f,w.type==='fw190'?10.51:9.92,
        111195*Math.cos(51.4*Math.PI/180)*(GEO.xToLon(1)-GEO.xToLon(0)));
      var u=f.userData;
      if(u.lat==null){
        u.lat=(fi-(w.models.length-1)/2)*7.5;          /* coherent company front */
        u.alt=((hash('y'+wi+fi)%5)-2)*0.25;            /* at most half a unit from the attack plane */
        u.stag=((hash('s'+wi+fi)%7)-3)*0.8;            /* slight real-world raggedness, never a separate phase */
      }
      /* The entire wave shares one phase.  Previously every fighter had
         its own randomized loop phase, which scattered dozens of little
         aircraft across the horizon and made them look unrelated to the
         battle. */
      var ph=Math.max(0,Math.min(1,(battleT-t0)/waveDur));
      var side=(u.lat>=0?1:-1);
      var alongPath=fighterPassCoordinate(ph,[-68,38,50,80]);
      var lateralPath=fighterPassCoordinate(ph,[0,0,12,22]);
      var verticalPath=fighterPassCoordinate(ph,[1.2,-.8,-4.8,-6.8]);
      var passScale=.30; // Presentation scale for the compressed battle clock.
      var along=alongPath.value+u.stag;
      var lat=u.lat+side*lateralPath.value;
      var vert=verticalPath.value+u.alt;
      // Path perturbations must depend on mission phase, not wall time.
      // Apply them in every segment so a phase boundary has no lateral jump.
      var envelope=Math.pow(Math.sin(Math.PI*ph),2);
      var envelopeD=Math.PI*Math.sin(2*Math.PI*ph);
      var lateralPhase=ph*waveDur*1.15+fi*0.35;
      var verticalPhase=ph*waveDur*2+fi*0.31;
      lat+=Math.sin(lateralPhase)*0.28*envelope;
      var px=a.pos.x+passScale*(a.dir.x*along+across.x*lat);
      var pz=a.pos.z+passScale*(a.dir.z*along+across.z*lat);
      var py=a.pos.y+passScale*(vert+Math.sin(verticalPhase)*0.18*envelope);
      var want=new THREE.Vector3(px,py,pz);
      f.position.copy(want);
      /* Analytic pass tangent: seeking and pausing never uses the
         previous frame's position to decide which end is the nose. */
      var va=alongPath.derivative;
      var vl=side*lateralPath.derivative;
      var vy=verticalPath.derivative;
      vl+=0.28*(Math.cos(lateralPhase)*waveDur*1.15*envelope+Math.sin(lateralPhase)*envelopeD);
      vy+=0.18*(Math.cos(verticalPhase)*waveDur*2*envelope+Math.sin(verticalPhase)*envelopeD);
      var vel=a.dir.clone().multiplyScalar(va).addScaledVector(across,vl);vel.y=vy;
      if(vel.lengthSq()>0.001){
        KasselFlightAttitude.apply(THREE,f,vel,0);
      }
      /* guns: a fighter only fires while CLOSING from astern — once
         it overtakes the box its guns go quiet (no shooting backwards
         out of the tail) */
      if(KM._playing&&ph<0.70&&along>-23&&along<-1&&bombers.length&&(V2._frame&2)===0){
        var gunNose=new THREE.Vector3(1,0,0).applyQuaternion(f.quaternion);
        var tgt=KasselFighterTargeting.select(f.position,gunNose,bombers,12,90,Math.PI/12);
        if(tgt){
          fireTracer(f.position,tgt.position,5,true);     /* German green-white */
          /* rounds coming at the ship whose crew view is open */
          var cv=KM._camState;
          if(cv&&cv.mode==='crew'&&cv._intFor===tgt)fireNearTracer(f.position,tgt.position.clone().add(new THREE.Vector3((Math.random()-.5)*.25,(Math.random()-.5)*.12,(Math.random()-.5)*.25)),true);
          /* the gunners whose guns bear answer from their own stations */
          if((V2._frame&3)===0&&V2.returnFire)V2.returnFire(tgt,f);
        }
      }
    });
  });
}

/* ---------- American fighters ----------
   The wrong turn carried the 445th away from its cover.  No Mustangs
   circle the B-24 box during the destruction.  They enter only after
   the late radio response, make an illustrative intercept, and continue
   out of the engagement. Return-cover manoeuvres need source constraints. */
function updateEscorts(battleT,missionT,dt,elapsed){
  var a=KM._anchor;if(!a)return;
  var across=new THREE.Vector3(-a.dir.z,0,a.dir.x);
  var germanTargets=[];
  (KM._fighterWaves||[]).forEach(function(w){(w.models||[]).forEach(function(f){if(f.visible)germanTargets.push(f);});});
  (KM._escorts||[]).forEach(function(e,i){
    var prev=e.userData._pv||(e.userData._pv=e.position.clone());
    prev.copy(e.position);
    var wanted=null,desiredDir=null;

    if(battleT>=300){
      /* Staggered pairs arrive from ahead and above, cut through the
         German attack plane, and continue aft.  This is an intercept,
         not an orbit around the bombers. */
      var arrival=300+(i>>1)*7+(i%2)*1.5;
      var iu=(battleT-arrival)/48;
      // Leave view after continuing beyond the pass. Otherwise the
      // circuit stays attached to the returning formation and descends with it.
      if(iu>=0&&iu<1.5){
        // Continue the pass after its attack segment; never clamp the
        // longitudinal motion or teleport into a fabricated cover slot.
        var bend=Math.min(1,iu);
        var pair=i>>1,side=(i%2?1:-1);
        var along=-82+iu*132+pair*3;
        var lateral=side*(16+pair*5)+Math.pow(Math.sin(bend*Math.PI),2)*side*5;
        var vertical=10-8*bend*bend*(3-2*bend)+(pair%2)*1.2;
        wanted=new THREE.Vector3(
          a.pos.x+a.dir.x*along+across.x*lateral,
          a.pos.y+vertical,
          a.pos.z+a.dir.z*along+across.z*lateral);
        desiredDir=a.dir.clone().multiplyScalar(132).addScaledVector(across,iu<1?Math.sin(2*bend*Math.PI)*Math.PI*side*5:0);
        desiredDir.y=iu<1?-48*bend*(1-bend):0;
      }
    }

    if(!wanted){e.visible=false;e.userData._wasVisible=false;return;}
    e.visible=true;
    if(e.children.length)KasselAircraftMapScale.fit(THREE,e,37*.3048,
      111195*Math.cos(51.4*Math.PI/180)*(GEO.xToLon(1)-GEO.xToLon(0)));
    e.position.copy(wanted);
    e.userData._wasVisible=true;

    var vel=desiredDir?desiredDir.clone():new THREE.Vector3().subVectors(e.position,prev);
    if(vel.lengthSq()>1e-6){
      KasselFlightAttitude.apply(THREE,e,vel,0);
    }
    /* Late intervention only: never fire at a bomber or a hidden
       attacker, and never fabricate a kill from a decorative tracer. */
    if(KM._playing&&battleT>=300&&battleT<370&&(V2._frame&7)===0){
      var escortNose=new THREE.Vector3(1,0,0).applyQuaternion(e.quaternion);
      var interceptTarget=KasselFighterTargeting.select(e.position,escortNose,germanTargets,4,90,Math.PI/12);
      if(interceptTarget)fireTracer(e.position,interceptTarget.position,9,false);
    }
  });
}

/* ═══════════ CAMERA + INPUT SYSTEM V2 ═══════════
   Drag and zoom work in EVERY view:
   orbit  — drag rotates, wheel/pinch zooms (snappy, multiplicative)
   follow — orbits the moving formation
   chase  — orbits the selected ship
   topdown— drag pans, wheel changes altitude
   crew   — drag turns your head, wheel focuses your eyes (FOV)   */
function crewHandoffLens(elapsed,startFov){
  var u=Math.max(0,Math.min(1,elapsed/1.5)),ease=u*u*(3-2*u);
  return {near:.01+.99*ease,fov:startFov+(50-startFov)*ease};
}
(function(){
  function cs(){return KM._camState;}
  /* a chase/crew view should never dump you back to orbit just because
     nothing (or a fallen ship) is selected — follow a flying ship */
  function anyShip(){
    if(KM._b24&&KM._b24.visible&&KM._b24.userData.alive!==false)return KM._b24;
    var l=(KM._fp||[]);
    for(var i=0;i<l.length;i++)
      if(l[i].visible&&l[i].userData.alive!==false)return l[i];
    return null;
  }
  function ensure(c){
    if(c._v2c)return;
    c._v2c=true;
    c.crewYaw=0;c.crewPitch=0;
    c.fTheta=0.6;c.fPhi=1.25;c.fR=.85;
    c.cTheta=0;c.cPhi=1.15;c.cR=.32;c._chaseInit=false;
    c.tdX=0;c.tdZ=0;c.tdH=3.7;
    c.radius=5;c.radTarget=5;
    c._autoR=true;
    if(c.target&&KM._anchor)c.target.copy(KM._anchor.pos);
  }
  function formationFocus(anchor){
    var ships=(KM._fp||[]).concat(KM._b24?[KM._b24]:[]);
    var active=ships.filter(function(ship){return ship.visible&&ship.userData.alive!==false;});
    var centre=new THREE.Vector3();
    if(!active.length)return {centre:anchor.pos,radius:1};
    active.forEach(function(ship){centre.add(ship.position);});
    centre.multiplyScalar(1/active.length);
    var radius=.1;
    active.forEach(function(ship){radius=Math.max(radius,ship.position.distanceTo(centre));});
    return {centre:centre,radius:radius};
  }
  function v2Camera(camera,dt,t){
    var c=cs();if(!c||!camera)return;
    ensure(c);
    if(c.mode==='crew'&&c.selectedPlane){
      var loss=c.selectedPlane.userData.v2;
      if(loss&&loss.beh==='fall'&&KM._missionT>=BATTLE_START&&KM._battleT>=loss.ft){
        /* Keep both aircraft and crew identity. setView handles enclosure
           cleanup; chase's existing interpolation supplies the pull-out. */
        var selected=c.selectedPlane,station=c.crewPos,startFov=camera.fov;
        KM.setView('chase');c.selectedPlane=selected;c._followPlane=selected;c.crewPos=station;c._crewLossHandoff=true;c._handoffElapsed=0;
        c._pulloutOffset=null;c._handoffStartFov=startFov;camera.fov=startFov;camera.updateProjectionMatrix();
      }
    }
    var shake=window.KMSimulatorConfig?.cameraShake?(c.shakeIntensity||0)*0.5:0;
    var a=KM._anchor;
    camera.up.set(0,1,0);
    /* crew mode needs a tight near-plane to sit inside the airframe */
    var handoffLens=c.mode==='chase'&&c._crewLossHandoff?crewHandoffLens(c._handoffElapsed||0,c._handoffStartFov||68):null;
    var viewPlane=c.selectedPlane||KM._b24;
    var viewScale=viewPlane&&viewPlane.userData.mapGeometryScale?viewPlane.userData.mapGeometryScale/.09:1;
    var wantNear=(c.mode==='crew'?0.01:handoffLens?handoffLens.near:1)*viewScale;
    var wantFov=handoffLens?handoffLens.fov:camera.fov;
    if(c.mode!=='chase'&&(camera.near!==wantNear||camera.fov!==wantFov)){camera.near=wantNear;camera.fov=wantFov;camera.updateProjectionMatrix();}

    if(c.mode==='orbit'){
      var formation=formationFocus(a);
      var halfV=camera.fov*Math.PI/360;
      var halfH=Math.atan(Math.tan(halfV)*camera.aspect);
      var fit=Math.max(.45,1.02*formation.radius/Math.sin(Math.min(halfV,halfH)));
      c.target.copy(formation.centre);
      c.radTarget=c._autoR===false?c._userR:fit;
      c.radius+=(c.radTarget-c.radius)*(1-Math.exp(-dt*12));
      camera.position.set(
        c.target.x+c.radius*Math.sin(c.phi)*Math.cos(c.theta),
        c.target.y+c.radius*Math.cos(c.phi),
        c.target.z+c.radius*Math.sin(c.phi)*Math.sin(c.theta));
      camera.lookAt(c.target);
    }else if(c.mode==='topdown'){
      var formationMap=formationFocus(a);
      var center=formationMap.centre;
      camera.up.set(0,0,-1);
      camera.position.set(center.x+c.tdX,center.y+c.tdH,center.z+c.tdZ);
      camera.lookAt(center.x+c.tdX,center.y,center.z+c.tdZ);
    }else if(c.mode==='flythrough'){
      // A moving target can translate more than an aircraft length in a
      // frame. Keep the camera offset in its moving reference frame.
      var reference=anyShip();
      var target=reference?reference.position:a.pos;
      var heading=reference?(reference.userData._lh??a.heading):a.heading;
      camera.position.set(
        target.x+c.fR*Math.sin(c.fPhi)*Math.cos(c.fTheta+heading),
        target.y+c.fR*Math.cos(c.fPhi),
        target.z+c.fR*Math.sin(c.fPhi)*Math.sin(c.fTheta+heading));
      camera.lookAt(target);
    }else if(c.mode==='crew'){
      var plane=c.selectedPlane;
      if(!plane||!plane.visible)plane=anyShip()||plane;
      c._followPlane=plane;
      /* if the view handed off to another ship, move the interior
         enclosure into THAT ship (otherwise you sit inside the raw
         exterior model of the new aircraft) */
      if(plane&&c._intFor!==plane&&V2.attachInterior(plane)===false){
        KM.setView('orbit');return;
      }
      var crewDef=KM._crewPositions?KM._crewPositions[c.crewPos]:null;
      /* when the modeled cockpit is active, sit in ITS seats */
      if(V2.DETAIL_SEATS&&V2._intActive&&V2._intActive.length&&
         V2.DETAIL_SEATS[c.crewPos])crewDef=V2.DETAIL_SEATS[c.crewPos];
      if(plane&&crewDef&&plane.visible){
        var off=new THREE.Vector3(crewDef.offset.x,crewDef.offset.y,crewDef.offset.z);
        /* Use the complete model transform, not an assumed uniform
           scale. Seat coordinates belong to the aircraft's local frame. */
        plane.updateWorldMatrix(true,false);
        camera.position.copy(plane.localToWorld(off));
        var crewWorldRotation=plane.getWorldQuaternion(new THREE.Quaternion());
        var d0=new THREE.Vector3(crewDef.look.x,crewDef.look.y,crewDef.look.z).normalize();
        var yaw0=Math.atan2(-d0.x,-d0.z),pitch0=Math.asin(Math.max(-1,Math.min(1,d0.y)));
        /* pitch clamp is RELATIVE to the station's base look — a ball
           gunner staring straight down can still raise and lower his
           eyes (absolute clamp froze vertical look in the turrets) */
        var pitch=pitch0+Math.max(-1.25,Math.min(1.25,c.crewPitch));
        pitch=Math.max(-1.52,Math.min(1.52,pitch));
        var yaw=yaw0+c.crewYaw;
        var ld=new THREE.Vector3(
          -Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));
        ld.applyQuaternion(crewWorldRotation);
        /* A crewman's horizon rolls with the airframe, unlike an exterior
           camera. World-up lookAt silently cancelled the aircraft's bank. */
        camera.up.set(0,1,0).applyQuaternion(crewWorldRotation);
        camera.lookAt(camera.position.x+ld.x*100,camera.position.y+ld.y*100,camera.position.z+ld.z*100);
      }else{KM.setView('orbit');}
    }else if(c.mode==='chase'){
      var pl=c.selectedPlane;
      if(!pl)pl=anyShip(); // Never silently replace a selected lost aircraft with another crew.
      c._followPlane=pl; /* the ship ACTUALLY on camera (for the caption) */
      if(pl){
        var lossFocus=KasselCrewLossFocus.select(pl,c,V2.CREW_LISTS||{},V2._chutes||[],window.KMCrewStations&&KMCrewStations.resolve);
        var focus=lossFocus.position,focusRadius=lossFocus.radius;
        var chaseNear=lossFocus.kind==='airman'&&focusRadius?Math.min(wantNear,focusRadius*.12):wantNear;
        if(camera.near!==chaseNear||camera.fov!==wantFov){
          camera.near=chaseNear;camera.fov=wantFov;camera.updateProjectionMatrix();
        }
        c._lossFocusKind=lossFocus.kind;
        if(!c._chaseInit){
          c._chaseInit=true;
          c.cTheta=Math.PI;     /* start astern */
          c.cPhi=1.18;
          c.cR=115*(pl.userData.mapGeometryScale||pl.scale.x||.0025);
        }
        /* Bank/pitch can change Euler yaw without changing heading.
           Derive heading from the normalized model's actual +X nose. */
        var chaseNose=new THREE.Vector3(1,0,0).applyQuaternion(pl.quaternion);
        if(Math.hypot(chaseNose.x,chaseNose.z)>1e-5)c._chaseHeading=Math.atan2(-chaseNose.z,chaseNose.x);
        var hd=(c._chaseHeading||0)-Math.PI/2;
        var want2=new THREE.Vector3(
          focus.x+(focusRadius||c.cR)*Math.sin(c.cPhi)*Math.cos(c.cTheta-hd),
          focus.y+(focusRadius||c.cR)*Math.cos(c.cPhi),
          focus.z+(focusRadius||c.cR)*Math.sin(c.cPhi)*Math.sin(c.cTheta-hd));
        var pullingOut=c._crewLossHandoff&&(c._handoffElapsed||0)<1.5;
        if(pullingOut){
          var localOffset=want2.clone().sub(focus);
          if(!c._pulloutOffset)c._pulloutOffset=camera.position.clone().sub(focus);
          c._pulloutOffset.lerp(localOffset,1-Math.exp(-dt*3.4));
          camera.position.copy(focus).add(c._pulloutOffset);
        }else{
          camera.position.copy(want2);
          c._pulloutOffset=null;
        }
        if(pullingOut){
          var previousLook=camera.quaternion.clone();camera.lookAt(focus);
          var chaseLook=camera.quaternion.clone();camera.quaternion.copy(previousLook).slerp(chaseLook,1-Math.exp(-dt*2.5));
          c._handoffElapsed=(c._handoffElapsed||0)+dt;
        }else camera.lookAt(focus);
      }else if(c._crewLossHandoff&&pl){
        var impact=pl.userData.v2&&pl.userData.v2.sitePos;
        if(impact)camera.lookAt(impact);
      }else{KM.setView('orbit');}
    }
    /* handheld shake — rotate the CAMERA, the world stays put */
    if(shake>0&&c.mode!=='topdown'){
      camera.rotation.x+=Math.sin(t*27.3)*shake*0.0042;
      camera.rotation.y+=Math.cos(t*31.7)*shake*0.0042;
      camera.rotation.z+=Math.sin(t*22.9)*shake*0.0023;
    }
  }
  KM._updateCamera=v2Camera;

  /* ───────── unified input — one handler, every mode ───────── */
  KM._setupInput=function(){
    var canvas=KM._canv;if(!canvas||canvas._v2input)return;
    canvas._v2input=true;
    var drag=null,pinch=0;
    function applyDrag(dx,dy){
      var c=cs();if(!c)return;ensure(c);
      if(c.mode==='orbit'){
        c.theta-=dx*0.0035;
        c.phi=Math.max(0.15,Math.min(1.45,c.phi-dy*0.0035));
      }else if(c.mode==='flythrough'){
        c.fTheta-=dx*0.0035;
        c.fPhi=Math.max(0.25,Math.min(1.5,c.fPhi-dy*0.0035));
      }else if(c.mode==='chase'){
        c.cTheta-=dx*0.0035;
        c.cPhi=Math.max(0.2,Math.min(1.5,c.cPhi-dy*0.0035));
      }else if(c.mode==='topdown'){
        var k=c.tdH*0.0012;
        c.tdX-=dx*k;c.tdZ-=dy*k;
      }else if(c.mode==='crew'){
        c.crewYaw=Math.max(-Math.PI*2/3,Math.min(Math.PI*2/3,c.crewYaw-dx*0.0045));
        c.crewPitch=Math.max(-Math.PI/3,Math.min(Math.PI/3,c.crewPitch+dy*0.0040));
      }
    }
    function applyZoom(delta){
      var c=cs();if(!c)return;ensure(c);
      var f=Math.exp(delta*0.0021);   /* snappy multiplicative zoom */
      if(c.mode==='orbit'){
        c.radTarget=Math.max(.45,Math.min(2400,(c.radTarget||c.radius)*f));
        c._autoR=false;c._userR=c.radTarget;     /* remember the user's own choice so the battle floor can release back to it afterward */
      }
      else if(c.mode==='flythrough'){c.fR=Math.max(.25,Math.min(700,c.fR*f));}
      else if(c.mode==='chase'){
        var selected=c.selectedPlane||KM._b24,zoomScale=selected&&selected.userData.mapGeometryScale?selected.userData.mapGeometryScale/.09:1;
        c.cR=Math.max(4*zoomScale,Math.min(420*zoomScale,c.cR*f));
      }
      else if(c.mode==='topdown'){c.tdH=Math.max(.65,Math.min(2600,c.tdH*f));}
      else if(c.mode==='crew'&&KM._cam){
        KM._cam.fov=Math.max(30,Math.min(80,KM._cam.fov*Math.exp(delta*0.0011)));
        KM._cam.updateProjectionMatrix();
      }
    }
    canvas.addEventListener('mousedown',function(e){
      var c=cs();if(c)c.dragging=true;
      drag={x:e.clientX,y:e.clientY};
    });
    window.addEventListener('mousemove',function(e){
      if(!drag)return;
      applyDrag(e.clientX-drag.x,e.clientY-drag.y);
      drag={x:e.clientX,y:e.clientY};
      if(V2.updateStationOverlay)V2.updateStationOverlay();
    });
    window.addEventListener('mouseup',function(){
      drag=null;var c=cs();if(c)c.dragging=false;
    });
    canvas.addEventListener('wheel',function(e){
      applyZoom(e.deltaY);e.preventDefault();
    },{passive:false});
    canvas.addEventListener('touchstart',function(e){
      var c=cs();if(c)c.dragging=true;
      if(e.touches.length===1)drag={x:e.touches[0].clientX,y:e.touches[0].clientY};
      if(e.touches.length===2){
        var dx=e.touches[0].clientX-e.touches[1].clientX,
            dy=e.touches[0].clientY-e.touches[1].clientY;
        pinch=Math.sqrt(dx*dx+dy*dy);
      }
    },{passive:true});
    canvas.addEventListener('touchmove',function(e){
      if(e.touches.length===2){
        var dx=e.touches[0].clientX-e.touches[1].clientX,
            dy=e.touches[0].clientY-e.touches[1].clientY;
        var d2=Math.sqrt(dx*dx+dy*dy);
        if(pinch>0)applyZoom((pinch-d2)*4.5);
        pinch=d2;e.preventDefault();return;
      }
      if(!drag)return;
      applyDrag(e.touches[0].clientX-drag.x,e.touches[0].clientY-drag.y);
      drag={x:e.touches[0].clientX,y:e.touches[0].clientY};
      e.preventDefault();
    },{passive:false});
    canvas.addEventListener('touchend',function(e){
      var remaining=e.touches[0];
      drag=remaining?{x:remaining.clientX,y:remaining.clientY}:null;
      pinch=0;var c=cs();if(c)c.dragging=!!remaining;
    });
    canvas.addEventListener('touchcancel',function(){
      drag=null;pinch=0;var c=cs();if(c)c.dragging=false;
    });
  };
})();

/* ---------- deterministic state for scrubbing ---------- */
function applyBattleState(scene,battleT){
  clearChutes();
  clearColumns(scene);
  V2.resetCrashReveals(scene);
  clearBombs();
  clearFlashes();
  clearDevastation();
  V2._bombed=false;
  /* no ghost smoke surviving a scrub or restart */
  flushPool(KM._smoke);flushPool(KM._fire);flushPool(KM._lossSmoke);
  V2._lastLossSmokeTime=undefined;
  var all=(KM._fp||[]).concat(KM._b24?[KM._b24]:[]);
  all.forEach(function(p){
    if(!p.userData.v2)initPlaneBattle(p,scene);
    var v=p.userData.v2;
    v.startPos=null;v.ctrl=null;v.fwd=null;v.devastated=false; /* recompute when needed */
    var ft=v.ft;
    if(v.beh!=='stay'&&ft!=null&&battleT>ft+(v.beh==='fall'?v.dur:140)){
      p.visible=false;p.userData.alive=false;
      if(v.beh==='fall'&&v.sitePos)addColumn(scene,v.sitePos,v.pilot);
      if(v.beh!=='fall'&&v.pilot)V2.revealCrash(scene,v.pilot);
    }else{
      p.visible=true;p.userData.alive=true;
    }
  });
}
KM._v2ApplyBattleState=applyBattleState;

/* ---------- scrub override — works through battle AND return ---------- */
KM.scrubTimeline=function(e){
  var bar=document.getElementById('cp-tl-bar');
  if(!bar)return;
  var rect=bar.getBoundingClientRect();
  if(!rect.width)return;
  seekMission(KMMissionTimeline.seekSeconds((e.clientX-rect.left)/rect.width,KM._playbackEndSeconds||300));
};
function seekMission(seconds){
  KM._seekToEnd=seconds>=(KM._playbackEndSeconds||300)-1e-7;
  var pct=KMMissionTimeline.routeAt(seconds);
  KM._missionT=pct;
  KM._playbackSeconds=seconds;
  KM._holdT=Math.max(0,Math.min(3,(seconds-300)/2.5));
  KM._simSeconds=KM._playbackSeconds;
  if(pct<BATTLE_START){
    KM._battleT=0;
    applyBattleState(KM._s,0);
    (KM._fighterWaves||[]).forEach(function(w){(w.models||[]).forEach(function(m){m.visible=false;});});
  }else if(pct<RETURN_START){
    KM._battleT=Math.min((pct-BATTLE_START)/BATTLE_FRAC*BATTLE_SPAN,BATTLE_SPAN-1);
    applyBattleState(KM._s,KM._battleT);
  }else{
    KM._battleT=BATTLE_SPAN-1;
    applyBattleState(KM._s,KMMissionTimeline.battleCueAtPlayback(KM._playbackSeconds));
  }
};

/* ---------- sun arc ---------- */
/* the mission clock, dawn liftoff to near-noon return: the palette
   below tracks the SAME `e` (0..1) the sun elevation already used, so
   the whole sky brightens and desaturates from pre-dawn navy/orange
   toward open midday blue across the flight, instead of holding one
   dusk-toned look from takeoff to touchdown. */
var SUN_PAL=null;
function sunPalette(){
  if(SUN_PAL)return SUN_PAL;
  var D=V2.SKY_DAWN,Y=V2.SKY_DAY;
  SUN_PAL={
    zenith:{a:new THREE.Color(D.zenith),b:new THREE.Color(Y.zenith)},
    mid:{a:new THREE.Color(D.mid),b:new THREE.Color(Y.mid)},
    horizon:{a:new THREE.Color(D.horizon),b:new THREE.Color(Y.horizon)},
    dawn:{a:new THREE.Color(D.dawn),b:new THREE.Color(Y.dawn)},
    fog:{a:new THREE.Color(D.fog),b:new THREE.Color(Y.fog)},
    tmp:new THREE.Color()
  };
  return SUN_PAL;
}
function updateSun(scene,missionT){
  var t=Math.min(missionT/0.95,1);
  var e=t*t*(3-2*t);
  var dir=new THREE.Vector3(
    0.62-(0.18*e),
    0.16+0.40*e,
    -0.30+0.06*e).normalize();
  var sm=scene.userData.v2skyMat;
  if(sm){
    sm.uniforms.sunDir.value.copy(dir);
    var pal=sunPalette();
    ['zenith','mid','horizon','dawn'].forEach(function(k){
      sm.uniforms[k].value.copy(pal[k].a).lerp(pal[k].b,e);
    });
  }
  var sl=scene.userData.v2sunLight;
  if(sl){sl.position.copy(dir.clone().multiplyScalar(1600));
    sl.intensity=1.8+e*0.8;
    sl.color.setHSL(0.085+e*0.04,0.75-e*0.35,0.62+e*0.08);}
  var sp=scene.userData.v2sunSprite;
  if(sp)sp.position.copy(dir.clone().multiplyScalar(3500));
  var st=scene.userData.v2stars;
  if(st)st.material.opacity=0; /* 08:00 departure in daylight, not a night mission */
  if(scene.fog&&scene.fog.color){
    var pal2=sunPalette();
    scene.fog.color.copy(pal2.fog.a).lerp(pal2.fog.b,e);
  }
}

/* ---------- HUD ---------- */
/* The mission ran roughly 06:00 takeoff to 12:42 return (the same
   anchor the sky-lighting lerp uses in updateSun). Map missionT
   linearly across that real span and render 24h military time, so the
   HUD gives a sense of how much real time each phase took alongside
   altitude/speed. */
function missionClock(mt){
  return KMMissionTimeline.clockAt(mt);
}
function getPhase(t){
  var phases=KM._missionPhases;if(!phases)return{name:'—',alt:0,spd:0};
  var keys=Object.keys(phases),cur=phases[keys[0]];
  keys.forEach(function(k){if(t>=phases[k].start)cur=phases[k];});
  return cur;
}
function updateHUD(phase,mT,battleT){
  var phEl=document.getElementById('cp-phase');
  if(phEl){
    var label=KM._playbackSeconds>300?'Remaining flights · time-lapse':phase.name;
    if(mT<RETURN_START&&battleT>0){
      var ev=null;
      (V2.EVENTS||[]).forEach(function(b){if(battleT>=b.t)ev=b;});
      if(ev)label=ev.d;
    }
    if(label.length>46)label=label.slice(0,46).replace(/\s+\S*$/,'')+'…';
    phEl.textContent=label;
  }
  /* locked onto one aircraft (chase or crew view): show ITS altitude and
     speed, so a ship going down reads its own fall, not the formation's */
  var shownAlt=phase.alt,shownSpd=phase.spd,cs=KM._camState,lock=cs&&(cs.mode==='chase'||cs.mode==='crew')?(cs._followPlane||cs.selectedPlane):null;
  if(lock&&lock.userData&&lock.userData.planeData&&V2.planeFlight){var fl=V2.planeFlight(lock);if(fl){shownAlt=fl.alt;shownSpd=fl.ias;}}
  var altEl=document.getElementById('cp-alt');
  if(altEl)altEl.textContent=(Math.round(shownAlt/100)*100).toLocaleString();
  var spdEl=document.getElementById('cp-spd');
  if(spdEl)spdEl.textContent=Math.round(shownSpd/5)*5;
  var clockEl=document.getElementById('cp-clock');
  if(clockEl)clockEl.textContent=missionClock(mT);
  var fill=document.getElementById('cp-tl-fill');
  var end=KM._playbackEndSeconds||300;
  var seconds=KM._playbackSeconds??KMMissionTimeline.secondsAt(mT);
  if(fill)fill.style.width=(100*KMMissionTimeline.seekFraction(seconds,end))+'%';
  var extended=end>300;
  if(V2._extendedTimeline!==extended){
    V2._extendedTimeline=extended;
    if(V2.fixTimeline)V2.fixTimeline();
  }
  var rail=document.getElementById('cp-tl-bar');
  if(rail){
    rail.setAttribute('role','slider');rail.setAttribute('tabindex','0');rail.setAttribute('aria-label','Mission timeline');
    rail.setAttribute('aria-valuemin','0');rail.setAttribute('aria-valuemax',String(Math.round(end)));rail.setAttribute('aria-valuenow',Math.round(seconds));
    rail.setAttribute('aria-valuetext',missionClock(mT)+' · '+Math.round(seconds)+' of '+Math.round(end)+' playback seconds');
    if(!rail._kmKeys){rail._kmKeys=true;rail.addEventListener('keydown',function(e){
      var s=KM._playbackSeconds??KMMissionTimeline.secondsAt(KM._missionT);
      if(e.key==='Home')s=0;else if(e.key==='End')s=KM._playbackEndSeconds||300;
      else if(e.key==='ArrowRight')s+=5;else if(e.key==='ArrowLeft')s-=5;else return;
      e.preventDefault();
      seekMission(Math.max(0,Math.min(KM._playbackEndSeconds||300,s)));
    });}
  }
  var marks=document.querySelectorAll('.cp-tl-mark');
  if(marks.length){
    var th=marks.length>=7?[0,0.22,0.42,0.66,0.74,0.78,0.92]:[0,0.22,0.42,0.66,0.74,0.78];
    marks.forEach(function(m,i){m.classList.toggle('active',mT>=(th[i]!=null?th[i]:1));});
  }
  /* the ▶/⏸ glyph is static markup owned by the page, not this script —
     keep it honest every frame so it always reflects what's actually
     happening (auto-play on load showed ▶ while already running, which
     read backwards the moment you clicked it to "pause") */
  var playBtn=document.getElementById('cp-play');
  if(playBtn){
    var want=KM._playing?'⏸':'▶';
    if(playBtn.textContent!==want)playBtn.textContent=want;
  }
}

/* ═══════════ MAIN LOOP (replaces block 8's) ═══════════ */
KM._buildAnimation=function(){
  var scene=KM._s,camera=KM._cam,renderer=KM._ren,water=KM._water;
  if(!scene||!camera||!renderer){console.error('KM v2: missing scene/camera/renderer');return;}
  if(KM._animRunning)return;KM._animRunning=true;
  if(KM._setupInput)KM._setupInput();
  initTracers(scene);
  initNearTracers(scene);
  var release=KMMissionTimeline.secondsAt(BOMBS_AWAY);
  var all=(KM._fp||[]).concat(KM._b24?[KM._b24]:[]);
  all.forEach(function(p){initPlaneBattle(p,scene);});
  V2._frame=0;
  var elapsed=0,lastTime=performance.now(),holdT=0;
  var frameInterval=1000/30,nextRender=lastTime+frameInterval;
  document.addEventListener('visibilitychange',function(){
    lastTime=performance.now();nextRender=lastTime+frameInterval;
  });

  function animate(){
    requestAnimationFrame(animate);
    var now=performance.now();
    // Keep a stable deadline. Resetting it to each delivered frame
    // can skip an extra refresh and alternate between uneven intervals.
    if(document.hidden||now+1<nextRender)return;
    nextRender+=frameInterval*Math.max(1,Math.floor((now-nextRender)/frameInterval)+1);
    var wallDelta=(now-lastTime)/1000;
    lastTime=now;
    var dt=Math.min(wallDelta,0.05);
    /* sim clock: choreography freezes dead when paused — the camera
       still answers the mouse, but the WAR stops */
    var sdt=KM._playing?dt:0;
    elapsed+=sdt;
    V2._frame++;
    try{
      if(KM._playing){
        if((KM._playbackSeconds||0)<(KM._playbackEndSeconds||300)){
          if(KM._playbackSeconds===undefined)KM._playbackSeconds=KMMissionTimeline.secondsAt(KM._missionT);
          KM._playbackSeconds=KMMissionTimeline.advancePlayback(KM._playbackSeconds,wallDelta*KM._speed,KM._playbackEndSeconds||300);
          KM._simSeconds=KM._playbackSeconds;
          KM._missionT=KMMissionTimeline.routeAt(KM._playbackSeconds);
          KM._battleT=KMMissionTimeline.battleAt(KM._missionT);
          if(KM._playbackSeconds>=300)KM._holdT=Math.min(3,(KM._playbackSeconds-300)/2.5);
          if(KM._playbackSeconds>=(KM._playbackEndSeconds||300))KM._playing=false;
        }else{KM._playing=false;}
        if(KM._camState)KM._camState.shakeIntensity=
          (KM._missionT<RETURN_START&&KM._battleT>20&&KM._battleT<360)?Math.min(1.2,KM._battleT/120):0;
      }
      updateAnchor(KM._missionT,KM._battleT,dt*KM._speed);
      elapsed=KMMissionTimeline.secondsAt(KM._missionT);
      var mapView=KM._camState&&(KM._camState.mode==='topdown'&&KM._camState.tdH>=45||KM._camState.mode==='orbit'&&KM._camState.radius>=45);
      scene.children.forEach(function(o){if(o.userData.geoMarker)o.visible=!!mapView;});
      (V2._crashGroups||[]).forEach(function(cg){if(cg.scene===scene){cg.group.visible=!!mapView;cg.labels.visible=!!mapView;}});
      var battleT=KM._battleT;

      var playback=KM._playbackSeconds||0;
      var prepareDrops=playback>=release&&playback<release+9&&!V2._bombed;
      all.forEach(function(p,index){
        placePlane(p,battleT,elapsed,scene,dt,prepareDrops&&index<18?release:undefined,index);
      });
      if(prepareDrops)V2._bombed=true;
      if(playback<release&&V2._bombed){clearBombs();V2._bombed=false;}
      if(bombs.length)updateBombs(playback,camera,KM._playing&&!prepareDrops);
      // A seek beyond the attack can construct previously unvisited routes.
      // Keep End anchored to the end if that construction extends the track.
      if(!KM._playing&&KM._seekToEnd&&KM._playbackSeconds<KM._playbackEndSeconds-1e-7){
        seekMission(KM._playbackEndSeconds);
        return;
      }
      /* Reconstruct loss trails from documentary time even while paused
         or after a seek. Other smoke effects keep their separate pool. */
      var smokeTime=KM._playbackSeconds??KMMissionTimeline.secondsAt(KM._missionT);
      if(KM._lossSmoke&&(V2._lastLossSmokeTime!==smokeTime||V2._lastLossSmokeGround!==V2.groundRevision)){
        V2._lastLossSmokeTime=smokeTime;V2._lastLossSmokeGround=V2.groundRevision;
        var lossStates=all.map(function(p){return p.userData.v2;});
        var trailPoints=KasselLossSmoke.sample(lossStates,smokeTime,KMMissionTimeline,KasselLossTrajectory,true);
        var lossPool=KM._lossSmoke;
        for(var si=0;si<lossPool.count;si++){
          var spoint=trailPoints[si];
          lossPool.pos[si*3]=spoint?spoint.x:-99999;
          lossPool.pos[si*3+1]=spoint?spoint.y:-99999;
          lossPool.pos[si*3+2]=spoint?spoint.z:-99999;
          lossPool.plume[si*2]=spoint?spoint.size:0;
          lossPool.plume[si*2+1]=spoint?spoint.opacity:0;
        }
        lossPool.geo.attributes.position.needsUpdate=true;
        lossPool.geo.attributes.plume.needsUpdate=true;
      }

      /* fighters + escorts + tracers + chutes + flashes */
      var fighterClock=KMMissionTimeline.battleCueAtPlayback(KM._playbackSeconds||0);
      updateFighters(fighterClock,sdt,elapsed,scene);
      updateEscorts(fighterClock,KM._missionT,sdt,elapsed);
      updateTracers(sdt);
      updateNearTracers(sdt);
      updateChutes(sdt,elapsed);
      updateFlashes(sdt);
      updateDevastation(sdt);

      /* smoke and fire dissipate on their own clock */
      if((V2._frame%25)===0){agePool(KM._smoke,13);agePool(KM._fire,2.5);}
      /* Collar: "the skies were full of bright flashes from the
         exploding shells" — 20 mm bursts popping around the box */
      if(KM._playing&&battleT>8&&battleT<340&&(V2._frame%18)===0){
        var aF=KM._anchor,acrF=new THREE.Vector3(-aF.dir.z,0,aF.dir.x);
        var fAl=(Math.random()-0.5)*180,fLa=(Math.random()-0.5)*130;
        killFlash(scene,new THREE.Vector3(
          aF.pos.x+aF.dir.x*fAl+acrF.x*fLa,
          aF.pos.y+(Math.random()-0.5)*18,
          aF.pos.z+aF.dir.z*fAl+acrF.z*fLa));
      }
      /* burning wreck columns — nothing burns before the battle */
      if(KM._missionT>=BATTLE_START)columns.forEach(function(c){
        c.glow.material.opacity=0.45+Math.sin(elapsed*7+c.pos.x)*0.18;
        /* Ground smoke shares the deterministic loss pool above. */
      });

      /* All animated aircraft parts share the documentary clock. Rates
         remain illustrative, not measured historical engine/prop RPM. */
      var propClock=KM._playbackSeconds||0;
      all.forEach(function(p){
        if(!p.visible)return;
        KasselPropellerAssembly.phase(p,propClock,21,33);
      });
      (KM._escorts||[]).forEach(function(f){
        if(f.visible)KasselPropellerAssembly.phase(f,propClock,33,48);
      });
      (KM._fighterWaves||[]).forEach(function(w){(w.models||[]).forEach(function(f){
        if(f.visible)KasselPropellerAssembly.phase(f,propClock,33,48);
      });});

      /* flak — battle window only */
      if(KM._flakMat&&KM._flakGeo){
        var showFlak=battleT>5&&battleT<360;
        KM._flakMat.opacity=showFlak?(0.18+Math.sin(elapsed*3)*0.1):0;
        if(showFlak){
          var fpos=KM._flakGeo.attributes.position.array;
          for(var fi=0;fi<KM._flakCount;fi++){
            fpos[fi*3+1]+=Math.sin(elapsed*2+fi)*0.3;
            if(Math.random()<0.006){
              fpos[fi*3]=KM._anchor.pos.x-60+Math.random()*180;
              fpos[fi*3+1]=KM._anchor.pos.y-40+Math.random()*80;
              fpos[fi*3+2]=KM._anchor.pos.z-90+Math.random()*180;
            }
          }
          KM._flakGeo.attributes.position.needsUpdate=true;
        }
      }

      /* water shimmer */
      if(water&&water.geometry&&water.geometry.attributes.position){
        var wv=water.geometry.attributes.position.array;
        for(var i=1;i<wv.length;i+=3){wv[i]=Math.sin(elapsed*0.5+wv[i-1]*0.01+wv[i+1]*0.01)*0.8;}
        water.geometry.attributes.position.needsUpdate=true;
      }
      /* pulsing waypoint rings */
      scene.children.forEach(function(c){
        if(c.userData&&c.userData.phase!==undefined&&!c.userData.isProp&&c.material&&c.geometry&&c.geometry.type==='RingGeometry'){
          var s2=1+Math.sin(elapsed*2.5+c.userData.phase)*0.3;
          c.scale.set(s2,s2,1);
        }
      });

      updateSun(scene,KM._missionT);
      var curPhase=getPhase(KM._missionT);
      KM._phase=curPhase.name;
      updateHUD(curPhase,KM._missionT,battleT);
      if(KM._updateCamera)KM._updateCamera(camera,dt,elapsed);
    }catch(err){if((V2._frame&255)===0)console.error('KM v2 loop',err);}
    if(V2._crewExterior)V2._crewExterior.update();
    renderer.render(scene,camera);
  }
  animate();

  window.addEventListener('resize',function(){
    var c2=KM._cont;
    if(c2&&camera&&renderer){
      var w2=c2.clientWidth,h2=c2.clientHeight;
      if(w2>0&&h2>0){camera.aspect=w2/h2;camera.updateProjectionMatrix();renderer.setSize(w2,h2);}
    }
  });
  console.log('KM v2: battle engine running');
};
/* ───────────── ENCLOSED 3D CREW STATIONS (per B-24J schematics) ─────────────
   Each station sits inside a REAL fuselage enclosure: riveted aluminum
   skin with formers and stringers, and transparency ONLY where the
   actual aircraft had glazing or openings — windshield + side panes on
   the flight deck, greenhouse lattice in the nose, turret domes, the
   open waist windows, the radio compartment's single window, and the
   tail turret's rear arc between the fins. Look anywhere else and you
   see airplane, exactly as the crews did. */

V2._interiors={};
V2._intActive=null;

/* ---------- interior skin painting (map carries alpha cutouts) ----------
   Modeled on the cutaways and restoration photos: dim zinc-chromate
   green over alclad, stamped formers WITH LIGHTENING HOLES (the
   signature B-24 interior detail), Z-section stringers, rivet rows,
   grime, and stenciled placards. */
function skinCanvas(W,H){
  var c=document.createElement('canvas');c.width=W;c.height=H;
  var g=c.getContext('2d');
  g.fillStyle='#33412f';g.fillRect(0,0,W,H);
  /* mottled chromate variation */
  for(var mv=0;mv<140;mv++){
    g.fillStyle='rgba('+(34+Math.random()*22|0)+','+(58+Math.random()*26|0)+','+(30+Math.random()*18|0)+',0.12)';
    g.fillRect(Math.random()*W,Math.random()*H,40+Math.random()*90,20+Math.random()*50);
  }
  var grad=g.createLinearGradient(0,0,0,H);
  grad.addColorStop(0,'rgba(8,10,9,0.62)');
  grad.addColorStop(0.5,'rgba(255,255,255,0.05)');
  grad.addColorStop(1,'rgba(6,8,7,0.66)');
  g.fillStyle=grad;g.fillRect(0,0,W,H);
  /* stamped formers with lightening holes */
  var fw=Math.round(W/9);
  for(var x=0;x<W;x+=fw){
    g.fillStyle='#222823';
    g.fillRect(x,0,16,H);
    g.fillStyle='rgba(190,196,190,0.13)';
    g.fillRect(x,0,3,H); /* flange highlight */
    /* the lightening holes — dark ovals down each former */
    for(var hy=H*0.08;hy<H*0.95;hy+=H/6.5){
      g.fillStyle='#0c0f0d';
      g.beginPath();g.ellipse(x+8,hy,5,9,0,0,7);g.fill();
      g.strokeStyle='rgba(160,166,160,0.25)';g.lineWidth=1.5;
      g.beginPath();g.ellipse(x+8,hy,5,9,0,0,7);g.stroke();
    }
  }
  /* Z-section stringers */
  for(var y=0;y<H;y+=Math.round(H/7)){
    g.fillStyle='rgba(16,20,17,0.9)';g.fillRect(0,y,W,5);
    g.fillStyle='rgba(185,190,185,0.10)';g.fillRect(0,y,W,1.5);
  }
  /* rivet rows */
  g.fillStyle='rgba(165,170,165,0.30)';
  for(var rx=0;rx<W;rx+=22)for(var ry=10;ry<H;ry+=Math.round(H/7)){
    g.beginPath();g.arc(rx+(ry%2?8:0),ry,1.4,0,7);g.fill();
  }
  /* scuffs + grime */
  for(var i=0;i<200;i++){
    g.fillStyle='rgba(15,17,15,'+(Math.random()*0.09)+')';
    g.fillRect(Math.random()*W,Math.random()*H,30+Math.random()*70,3+Math.random()*9);
  }
  /* a couple of stenciled placards */
  g.fillStyle='rgba(212,206,180,0.35)';
  g.font='600 11px monospace';
  g.fillText('NO STEP',W*0.31,H*0.18);
  g.fillText('OXYGEN',W*0.62,H*0.55);
  return {c:c,g:g};
}

/* the B-24 panel, painted from the USAF photo: black crackle face,
   two pilot clusters + center engine stack, glass bezels, needles */
function panelCanvas(){
  var c=document.createElement('canvas');c.width=1024;c.height=320;
  var g=c.getContext('2d');
  g.fillStyle='#101113';g.fillRect(0,0,1024,320);
  for(var n=0;n<2600;n++){ /* crackle finish */
    g.fillStyle='rgba('+(18+Math.random()*16|0)+','+(19+Math.random()*16|0)+','+(21+Math.random()*16|0)+',0.5)';
    g.fillRect(Math.random()*1024,Math.random()*320,2,2);
  }
  function gauge(cx,cy,r,seed){
    g.fillStyle='#08090a';
    g.beginPath();g.arc(cx,cy,r,0,7);g.fill();
    var rim=g.createRadialGradient(cx-r*0.3,cy-r*0.3,r*0.4,cx,cy,r*1.15);
    rim.addColorStop(0,'rgba(255,255,255,0)');
    rim.addColorStop(0.85,'rgba(150,158,165,0.25)');
    rim.addColorStop(1,'rgba(220,226,232,0.5)');
    g.fillStyle=rim;g.beginPath();g.arc(cx,cy,r*1.12,0,7);g.fill();
    g.strokeStyle='#3a3f45';g.lineWidth=3;
    g.beginPath();g.arc(cx,cy,r,0,7);g.stroke();
    /* tick marks */
    g.strokeStyle='rgba(235,238,225,0.8)';g.lineWidth=1.6;
    for(var t2=0;t2<11;t2++){
      var a2=Math.PI*0.75+t2*(Math.PI*1.5/10);
      g.beginPath();
      g.moveTo(cx+Math.cos(a2)*r*0.72,cy+Math.sin(a2)*r*0.72);
      g.lineTo(cx+Math.cos(a2)*r*0.86,cy+Math.sin(a2)*r*0.86);
      g.stroke();
    }
    /* needle */
    var na=Math.PI*0.75+((seed*1.37)%1)*(Math.PI*1.5);
    g.strokeStyle='#e8ecdf';g.lineWidth=2.6;
    g.beginPath();g.moveTo(cx-Math.cos(na)*r*0.14,cy-Math.sin(na)*r*0.14);
    g.lineTo(cx+Math.cos(na)*r*0.62,cy+Math.sin(na)*r*0.62);g.stroke();
    g.fillStyle='#c9cdbf';g.beginPath();g.arc(cx,cy,3,0,7);g.fill();
    /* glass glare */
    g.fillStyle='rgba(255,255,255,0.07)';
    g.beginPath();g.ellipse(cx-r*0.32,cy-r*0.38,r*0.45,r*0.22,-0.7,0,7);g.fill();
  }
  /* left + right pilot clusters (3×2 each) */
  [140,884].forEach(function(bx,bi){
    for(var r2=0;r2<2;r2++)for(var q=0;q<3;q++){
      gauge(bx-95+q*95,80+r2*120,38,bi*7+r2*3+q);
    }
  });
  /* center: engine instrument stack (smaller, 4×2) */
  for(var r3=0;r3<2;r3++)for(var q2=0;q2<4;q2++){
    gauge(400+q2*75,86+r3*118,30,20+r3*4+q2);
  }
  /* switch rows under center */
  for(var s2=0;s2<14;s2++){
    g.fillStyle='#1b1d20';g.fillRect(360+s2*23,250,10,26);
    g.fillStyle=s2%3?'#c2c6ba':'#7e8278';
    g.fillRect(362+s2*23,252+(s2%2?12:2),6,10);
  }
  /* placards */
  g.fillStyle='rgba(220,214,188,0.6)';g.font='700 10px monospace';
  g.fillText('FUEL  PRESS',120,290);g.fillText('MAN  PRESS',470,42);
  g.fillText('RPM',560,42);g.fillText('ALT',840,290);
  return new THREE.CanvasTexture(c);
}

/* quilted insulation padding — the flight deck's padded blankets */
function quiltCanvas(){
  var c=document.createElement('canvas');c.width=512;c.height=256;
  var g=c.getContext('2d');
  g.fillStyle='#2e3d2c';g.fillRect(0,0,512,256);
  for(var i=0;i<90;i++){
    g.fillStyle='rgba('+(40+Math.random()*16|0)+','+(56+Math.random()*18|0)+','+(36+Math.random()*12|0)+',0.3)';
    g.fillRect(Math.random()*512,Math.random()*256,30,30);
  }
  g.strokeStyle='rgba(20,18,12,0.7)';g.lineWidth=2;
  for(var d=-256;d<512;d+=42){
    g.beginPath();g.moveTo(d,0);g.lineTo(d+256,256);g.stroke();
    g.beginPath();g.moveTo(d+256,0);g.lineTo(d,256);g.stroke();
  }
  /* button dimples at intersections */
  g.fillStyle='rgba(12,11,8,0.8)';
  for(var qx=21;qx<512;qx+=42)for(var qy=21;qy<256;qy+=42){
    g.beginPath();g.arc(qx,qy,3,0,7);g.fill();
  }
  return new THREE.CanvasTexture(c);
}
/* punch a window: alpha→0, then opaque frame + optional lattice bars */
function punch(sk,u0,v0,u1,v1,lattice){
  var W=sk.c.width,H=sk.c.height,g=sk.g;
  var x=u0*W,y=(1-v1)*H,w=(u1-u0)*W,h=(v1-v0)*H;
  g.clearRect(x,y,w,h);
  g.strokeStyle='#23282a';g.lineWidth=10;
  g.strokeRect(x+3,y+3,w-6,h-6);
  if(lattice){
    g.lineWidth=6;
    var nx=lattice[0],ny=lattice[1];
    for(var i=1;i<nx;i++){g.beginPath();g.moveTo(x+w*i/nx,y);g.lineTo(x+w*i/nx,y+h);g.stroke();}
    for(var j=1;j<ny;j++){g.beginPath();g.moveTo(x,y+h*j/ny);g.lineTo(x+w,y+h*j/ny);g.stroke();}
  }
}
function skinMat(sk){
  var tex=new THREE.CanvasTexture(sk.c);
  return new THREE.MeshStandardMaterial({
    map:tex,transparent:true,alphaTest:0.35,
    roughness:0.8,metalness:0.22,side:THREE.BackSide});
}
function capMat(sk){
  var tex=new THREE.CanvasTexture(sk.c);
  return new THREE.MeshStandardMaterial({
    map:tex,transparent:true,alphaTest:0.35,
    roughness:0.8,metalness:0.22,side:THREE.DoubleSide});
}

/* horizontal fuselage tube along the aircraft's +x.
   canvas u: 0=BOTTOM · .25=LEFT · .5=TOP · .75=RIGHT ; v: 0=aft → 1=fwd */
function tubeAlong(len,rad,ovalY,sk){
  var geo=new THREE.CylinderGeometry(rad,rad,len,28,1,true);
  geo.rotateZ(-Math.PI/2);  /* axis → +x */
  geo.rotateX(Math.PI/2);   /* spin skin so u=0 sits at the belly */
  geo.scale(1,ovalY||1.12,1);
  return new THREE.Mesh(geo,skinMat(sk));
}
/* flat cap at x (facing the camera), with its own painted canvas */
function capAt(x,rad,ovalY,sk,flip){
  var geo=new THREE.CircleGeometry(rad*1.02,26);
  geo.scale(1,ovalY||1.12,1);
  var m=new THREE.Mesh(geo,capMat(sk));
  m.position.x=x;
  m.rotation.y=flip?Math.PI/2:-Math.PI/2;
  return m;
}
function capCanvas(){
  var sk=skinCanvas(512,512);
  return sk;
}

function intMats(){
  if(V2._intMats)return V2._intMats;
  var c=document.createElement('canvas');c.width=512;c.height=256;
  var g=c.getContext('2d');
  g.fillStyle='#0b0c0e';g.fillRect(0,0,512,256);
  for(var r=0;r<2;r++)for(var i=0;i<6;i++){
    var cx=50+i*82,cy=70+r*116,rad=30;
    g.fillStyle='#15171b';g.beginPath();g.arc(cx,cy,rad,0,7);g.fill();
    g.strokeStyle='#2c3038';g.lineWidth=3;g.beginPath();g.arc(cx,cy,rad,0,7);g.stroke();
    g.strokeStyle='rgba(230,235,210,0.8)';g.lineWidth=2;
    var na=Math.PI*0.75+((i*1.7+r)%4.7);
    g.beginPath();g.moveTo(cx,cy);g.lineTo(cx+Math.cos(na)*rad*0.65,cy+Math.sin(na)*rad*0.65);g.stroke();
    g.fillStyle='rgba(255,196,80,0.7)';g.beginPath();g.arc(cx,cy,2.5,0,7);g.fill();
  }
  var dialTex=new THREE.CanvasTexture(c);
  V2._intMats={
    frame:new THREE.MeshStandardMaterial({color:0x0b0c0f,roughness:0.85,metalness:0.3}),
    metal:new THREE.MeshStandardMaterial({color:0x1d2124,roughness:0.6,metalness:0.45}),
    canvasy:new THREE.MeshStandardMaterial({color:0x27331f,roughness:0.95,metalness:0.05}),
    olive:new THREE.MeshStandardMaterial({color:0x44542f,roughness:0.8,metalness:0.08}),
    loom:new THREE.MeshStandardMaterial({color:0xc4ab74,roughness:0.85,metalness:0}),
    glass:new THREE.MeshStandardMaterial({color:0x9cc1e2,roughness:0.08,metalness:0.6,
      transparent:true,opacity:0.10,side:THREE.DoubleSide,depthWrite:false}),
    dials:new THREE.MeshStandardMaterial({map:dialTex,emissiveMap:dialTex,
      emissive:0xffffff,emissiveIntensity:0.5,roughness:0.6,metalness:0.2}),
    gun:new THREE.MeshStandardMaterial({color:0x101214,roughness:0.4,metalness:0.7})
  };
  return V2._intMats;
}
function box(w,h,d,m){return new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);}
function cyl(r1,r2,h,m,seg){return new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,seg||10),m);}
function torus(r,t,m,arc){return new THREE.Mesh(new THREE.TorusGeometry(r,t,8,28,arc||Math.PI*2),m);}


/* curved REAL-PHOTOGRAPH wall standing around the room's VERTICAL
   axis. thetaC = horizontal bearing of the photo's center:
   atan2(x,z) — 0 faces +z, π/2 faces +x (forward), -π/2 aft-ish. */
function photoWall(g,url,thetaC,radius,height,arc,cx,cy,cz){
  var ldr=new THREE.TextureLoader();
  ldr.setCrossOrigin('anonymous');
  ldr.load(url,function(pTex){
    pTex.encoding=THREE.sRGBEncoding;
    /* BackSide flips u — mirror the map so text reads correctly */
    pTex.wrapS=THREE.RepeatWrapping;pTex.repeat.x=-1;
    var wall=new THREE.Mesh(
      new THREE.CylinderGeometry(radius,radius,height,28,1,true,
        thetaC-arc/2,arc),
      new THREE.MeshBasicMaterial({map:pTex,side:THREE.BackSide,
        color:0xa8b0a6}));
    wall.position.set(cx||0,cy||0,cz||0);
    g.add(wall);
  });
}

function buildInterior(station){
  if(V2._interiors[station])return V2._interiors[station];
  var M=intMats();
  var g=new THREE.Group();
  g.name='v2int_'+station;

  if(station==='pilot'||station==='copilot'){
    /* FLIGHT DECK — the windshield WRAPS your face like the USAF photo:
       the whole upper forward view is glass with thin framing */
    var sk=skinCanvas(1024,512);
    punch(sk,0.655,0.42,0.815,0.86);         /* right side window (u .75) */
    punch(sk,0.185,0.42,0.345,0.86);         /* left side window  (u .25) */
    punch(sk,0.42,0.70,0.58,0.97,[3,1]);     /* roof eyebrow panels       */
    var tube=tubeAlong(4.6,2.15,1.08,sk);
    g.add(tube);
    /* forward cap: glass dominates — four big panes, thin center post */
    var fc=capCanvas();
    punch(fc,0.10,0.42,0.465,0.92,[2,1]);    /* left main panes  */
    punch(fc,0.535,0.42,0.90,0.92,[2,1]);    /* right main panes */
    punch(fc,0.13,0.18,0.34,0.38);           /* lower quarter pane L */
    punch(fc,0.66,0.18,0.87,0.38);           /* lower quarter pane R */
    g.add(capAt(1.55,2.15,1.08,fc,false));
    /* aft cap: solid bulkhead w/ painted crew door */
    var ac=capCanvas();
    ac.g.fillStyle='#22261f';ac.g.fillRect(200,210,112,250);
    ac.g.strokeStyle='#14161a';ac.g.lineWidth=8;ac.g.strokeRect(200,210,112,250);
    g.add(capAt(-2.3,2.15,1.08,ac,true));
    /* THE PANEL — painted from the USAF photo: black crackle face,
       pilot clusters, center engine stack, switch rows */
    var dash=box(0.12,0.7,3.0,M.frame);
    dash.position.set(1.32,-0.78,0);dash.rotation.z=-0.14;g.add(dash);
    var panelTx=panelCanvas();
    var face=new THREE.Mesh(new THREE.PlaneGeometry(2.95,0.78),
      new THREE.MeshStandardMaterial({map:panelTx,emissiveMap:panelTx,
        emissive:0xffffff,emissiveIntensity:0.32,roughness:0.55,metalness:0.25}));
    face.position.set(1.25,-0.70,0);face.rotation.y=-Math.PI/2;
    face.rotateOnAxis(new THREE.Vector3(1,0,0),-0.14);g.add(face);
    var lip=box(0.3,0.06,2.9,M.frame);lip.position.set(1.28,-0.36,0);g.add(lip);
    /* quilted insulation padding lining the upper walls (the flight
       deck was blanketed) */
    var qTex=quiltCanvas();qTex.wrapS=qTex.wrapT=THREE.RepeatWrapping;qTex.repeat.set(3,1);
    var quilt=new THREE.Mesh(
      new THREE.CylinderGeometry(2.05,2.05,2.8,24,1,true,Math.PI*0.15,Math.PI*0.7),
      new THREE.MeshStandardMaterial({map:qTex,roughness:0.95,metalness:0,side:THREE.BackSide}));
    quilt.rotation.z=-Math.PI/2;quilt.rotation.x=Math.PI/2;
    quilt.position.set(-0.8,0.15,0);g.add(quilt);
    /* throttle pedestal: 8 levers in the center console */
    var ped=box(0.8,0.6,0.45,M.frame);ped.position.set(0.95,-1.45,0);g.add(ped);
    for(var th=0;th<8;th++){
      var lever=cyl(0.02,0.02,0.42,M.metal);
      lever.position.set(0.95+(th%2)*0.12,-1.08,-0.15+(th>>1)*0.1);
      lever.rotation.z=0.45+(th%2)*0.12;g.add(lever);
      var knob=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,8),
        th<4?M.frame:M.metal);
      knob.position.set(lever.position.x+0.19,-0.90,lever.position.z);g.add(knob);
    }
    /* control columns + REAL 3-spoke wheels */
    [-0.62,0.62].forEach(function(z){
      var col=cyl(0.05,0.05,0.9,M.metal);
      col.position.set(1.05,-1.3,z);col.rotation.z=0.55;g.add(col);
      var wg=new THREE.Group();
      var rim=torus(0.27,0.035,M.frame);
      wg.add(rim);
      for(var sp=0;sp<3;sp++){
        var spoke=cyl(0.018,0.018,0.26,M.metal);
        spoke.rotation.z=sp*Math.PI*2/3;
        spoke.position.set(Math.sin(sp*Math.PI*2/3)*0.13,Math.cos(sp*Math.PI*2/3)*0.13,0);
        wg.add(spoke);
      }
      var hub=cyl(0.05,0.05,0.06,M.frame);hub.rotation.x=Math.PI/2;wg.add(hub);
      wg.position.set(0.78,-0.88,z);
      wg.rotation.y=Math.PI/2;wg.rotation.x=-0.12;
      g.add(wg);
      /* armored seat w/ cushion + frame */
      var seat=box(0.5,0.16,0.55,M.canvasy);seat.position.set(-0.9,-1.18,z);g.add(seat);
      var back=box(0.12,0.85,0.55,M.canvasy);back.position.set(-1.16,-0.72,z);g.add(back);
      var armor=box(0.05,0.9,0.5,M.metal);armor.position.set(-1.25,-0.70,z);g.add(armor);
    });
    /* faint glass behind the cap panes for glint */
    var ws=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.6),M.glass);
    ws.position.set(1.62,0.45,0);ws.rotation.y=-Math.PI/2;
    g.add(ws);
    /* 3D windshield mullions — real frame bars in front of the glass
       give the glazing depth a painted cutout can't */
    [[-0.02,0],[-0.02,-0.95],[-0.02,0.95]].forEach(function(mp){
      var post=box(0.07,1.5,0.09,M.frame);
      post.position.set(1.52+mp[0],0.45,mp[1]);
      post.rotation.z=-0.1;g.add(post);
    });
    var hdr=box(0.07,0.09,2.1,M.frame);hdr.position.set(1.46,1.2,0);g.add(hdr);
    var sill=box(0.09,0.09,2.1,M.frame);sill.position.set(1.55,-0.32,0);g.add(sill);
    /* glareshield hood over the panel */
    var hood=box(0.5,0.05,2.95,M.frame);
    hood.position.set(1.12,-0.34,0);hood.rotation.z=-0.06;g.add(hood);
    /* floor: dark deck + diamond-plate walkway between the seats */
    var deck5=box(3.6,0.08,2.6,M.frame);deck5.position.set(-0.3,-1.85,0);g.add(deck5);
    var walk=box(3.4,0.04,0.5,M.metal);walk.position.set(-0.3,-1.79,0);g.add(walk);
    /* rudder pedals under the panel, per seat */
    [-0.62,0.62].forEach(function(z5){
      [-0.16,0.16].forEach(function(dz){
        var ped5=box(0.06,0.22,0.14,M.metal);
        ped5.position.set(1.05,-1.62,z5+dz);ped5.rotation.z=0.5;g.add(ped5);
      });
    });
    /* side consoles (trim + radio remotes) beside each seat */
    [-1.35,1.35].forEach(function(z6){
      var con=box(1.1,0.32,0.34,M.frame);con.position.set(-0.5,-1.45,z6);g.add(con);
      var conf=new THREE.Mesh(new THREE.PlaneGeometry(1.0,0.3),M.dials);
      conf.position.set(-0.5,-1.27,z6*0.985);
      conf.rotation.x=-Math.PI/2;g.add(conf);
    });
    /* sun visors stowed against the header */
    [-0.6,0.6].forEach(function(z7){
      var visor=box(0.02,0.22,0.5,M.canvasy);
      visor.position.set(1.38,1.05,z7);visor.rotation.z=-0.35;g.add(visor);
    });
    /* overhead: elevator trim crank + compass on the center post */
    var crank=torus(0.12,0.02,M.metal);
    crank.position.set(0.5,1.55,0);crank.rotation.x=Math.PI/2;g.add(crank);
    var compass=box(0.16,0.18,0.16,M.frame);compass.position.set(1.42,0.95,0);g.add(compass);
  }
  else if(station==='bomb'||station==='nav'){
    /* NOSE — greenhouse glazing, nose-turret back blocking dead ahead */
    var sk=skinCanvas(1024,512);
    punch(sk,0.60,0.50,0.88,0.95,[4,2]);     /* right greenhouse (u .75) */
    punch(sk,0.12,0.50,0.40,0.95,[4,2]);     /* left greenhouse  (u .25) */
    if(station==='bomb'){
      /* bomb-aiming flat panel in the belly (u 0 wraps the seam) */
      punch(sk,0.0,0.30,0.05,0.55,[1,2]);
      punch(sk,0.95,0.30,1.0,0.55,[1,2]);
    }
    var tube=tubeAlong(4.6,1.95,1.05,sk);
    g.add(tube);
    var fc=capCanvas();
    /* nose turret bulk blocks dead-ahead; glazing wraps around it */
    punch(fc,0.10,0.28,0.90,0.82,[6,2]);
    fc.g.fillStyle='#23271f';
    fc.g.beginPath();fc.g.arc(256,230,108,0,7);fc.g.fill();
    fc.g.fillRect(190,230,132,200);
    fc.g.strokeStyle='#10130f';fc.g.lineWidth=8;
    fc.g.beginPath();fc.g.arc(256,230,108,0,7);fc.g.stroke();
    fc.g.strokeRect(190,230,132,200);
    g.add(capAt(2.3,1.95,1.05,fc,false));
    var ac=capCanvas();g.add(capAt(-2.3,1.95,1.05,ac,true));
    /* (3D rib arcs removed — they floated free of the glazing) */
    /* deck + oxygen bottles + ammo cans for the nose guns */
    var deck6=box(4.2,0.08,2.4,M.frame);deck6.position.set(-0.1,-1.75,0);g.add(deck6);
    var o2m=new THREE.MeshStandardMaterial({color:0x6a7a40,roughness:0.5,metalness:0.5});
    [[-1.6,-1.35,0.9],[-1.6,-1.35,0.55]].forEach(function(pp){
      var bt=cyl(0.13,0.13,0.65,o2m,10);
      bt.rotation.z=Math.PI/2;bt.position.set(pp[0],pp[1],pp[2]);g.add(bt);
    });
    [[-0.9,1.0],[-1.1,-1.0]].forEach(function(pa){
      var can=box(0.42,0.3,0.26,M.gun);can.position.set(pa[0],-1.5,pa[1]);g.add(can);
    });
    if(station==='bomb'){
      /* THE NORDEN — hooded sight on its stabilizer, kneeling pad,
         bomb-release panel at the right hand */
      var stab=cyl(0.15,0.18,0.4,M.gun,10);stab.position.set(1.15,-1.55,0);g.add(stab);
      var sightBody=box(0.26,0.3,0.24,M.gun);sightBody.position.set(1.15,-1.22,0);g.add(sightBody);
      var eyepiece=cyl(0.07,0.09,0.3,M.metal,8);
      eyepiece.rotation.z=0.7;eyepiece.position.set(1.0,-1.05,0);g.add(eyepiece);
      var pad=box(1.2,0.14,0.7,M.canvasy);pad.position.set(0.45,-1.66,0);g.add(pad);
      var relPanel=box(0.08,0.4,0.5,M.frame);relPanel.position.set(0.95,-1.0,0.85);g.add(relPanel);
      var relFace=new THREE.Mesh(new THREE.PlaneGeometry(0.45,0.36),M.dials);
      relFace.position.set(0.90,-1.0,0.85);relFace.rotation.y=-Math.PI/2;g.add(relFace);
      /* the bombardier's CONTROL PANEL on the left wall — interval
         control, indicator lights, formation lights (per the photo) */
      var bpC=document.createElement('canvas');bpC.width=256;bpC.height=384;
      var bg=bpC.getContext('2d');
      bg.fillStyle='#15181a';bg.fillRect(0,0,256,384);
      bg.strokeStyle='#2e3336';bg.lineWidth=4;bg.strokeRect(6,6,244,372);
      for(var bl=0;bl<4;bl++){
        for(var bc=0;bc<6;bc++){
          bg.fillStyle=((bl*6+bc)%5===0)?'rgba(255,170,80,0.9)':'#0a0b0c';
          bg.beginPath();bg.arc(38+bc*36,60+bl*48,7,0,7);bg.fill();
          bg.strokeStyle='#3a4045';bg.lineWidth=1.5;
          bg.beginPath();bg.arc(38+bc*36,60+bl*48,9,0,7);bg.stroke();
        }
      }
      for(var bs=0;bs<8;bs++){
        bg.fillStyle='#1d2124';bg.fillRect(28+bs*27,268,10,30);
        bg.fillStyle='#c2c6ba';bg.fillRect(30+bs*27,270+(bs%2?14:2),6,11);
      }
      bg.fillStyle='rgba(212,206,180,0.55)';bg.font='600 10px monospace';
      bg.fillText('BOMB INTERVAL CONTROL',38,30);
      bg.fillText('BOMB INDICATOR LIGHTS',38,252);
      bg.fillText('BOMB FORMATION LIGHTS',38,330);
      var bpTex=new THREE.CanvasTexture(bpC);
      var bPanel=new THREE.Mesh(new THREE.PlaneGeometry(0.7,1.05),
        new THREE.MeshStandardMaterial({map:bpTex,emissiveMap:bpTex,
          emissive:0xffffff,emissiveIntensity:0.25,roughness:0.6,metalness:0.3}));
      bPanel.position.set(0.1,-0.55,-1.62);bPanel.rotation.y=0.25;g.add(bPanel);
      var bSeat=box(0.5,0.12,0.5,M.canvasy);bSeat.position.set(-0.2,-1.45,0);g.add(bSeat);
      var bPost=cyl(0.05,0.05,0.5,M.metal);bPost.position.set(-0.2,-1.72,0);g.add(bPost);
      /* THE REAL THING: the user's bombardier-compartment photograph,
         curved around the aft of the station — turn around and you're
         looking at the actual airplane */
photoWall(g,'https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2b336aebc80e81c23fc505_km-bomb-photo.jpg',
        Math.atan2(-1,0),1.85,3.0,Math.PI*0.85,-0.9,-0.2,0);
    }else{
      /* NAVIGATOR — chart table with painted map, anglepoise lamp,
         drift meter, stool */
      /* THE REAL NAVIGATOR'S CORNER — his photograph wrapped on the
         right side where the table lived */
photoWall(g,'https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2b3e21ba9c773fc7e6f1a9_km-nav-photo.jpg',
        Math.atan2(0.55,0.85),1.8,2.8,Math.PI*0.75,-0.2,-0.1,0);
      var nLamp=new THREE.PointLight(0xffe2b0,0.18,1.6);
      nLamp.position.set(-0.45,-0.55,1.2);g.add(nLamp);

    }
  }
  else if(station==='nose'||station==='ttop'||station==='ball'||station==='tail'){
    if(station==='nose'){
      /* CONSOLIDATED NOSE TURRET — curved glazing and armor around the
         real supplied gunner's seat, with the twin guns pointed forward. */
      var noseDome=new THREE.Mesh(new THREE.SphereGeometry(1.22,24,16),M.glass);
      noseDome.position.x=-0.12;g.add(noseDome);
      for(var nr=0;nr<4;nr++){
        var noseRib=torus(1.225,0.035,M.frame,Math.PI*1.65);
        noseRib.rotation.set(Math.PI/2,nr*Math.PI/4,0);
        noseRib.position.x=-0.12;g.add(noseRib);
      }
      var noseArmor=box(0.12,0.75,0.60,M.frame);
      noseArmor.position.set(-1.05,-0.45,0);g.add(noseArmor);
    }else if(station==='ttop'){
      /* MARTIN TOP TURRET — dome above, solid fuselage spine below */
      var ring=cyl(1.5,1.5,1.4,skinMat(skinCanvas(512,256)),24);
      ring.geometry=new THREE.CylinderGeometry(1.5,1.5,1.4,24,1,true);
      ring.material.side=THREE.BackSide;
      ring.position.y=-1.0;g.add(ring);
      var floor=new THREE.Mesh(new THREE.CircleGeometry(1.5,24),capMat(skinCanvas(256,256)));
      floor.rotation.x=Math.PI/2;floor.position.y=-1.65;g.add(floor);
      var dome=new THREE.Mesh(new THREE.SphereGeometry(1.55,18,10,0,Math.PI*2,0,Math.PI*0.52),M.glass);
      dome.position.y=-0.35;g.add(dome);
      for(var mm=0;mm<4;mm++){
        var bar=torus(1.55,0.05,M.frame,Math.PI*0.95);
        bar.rotation.set(Math.PI/2-1.4,mm*Math.PI/4,0);
        bar.position.y=-0.35;g.add(bar);
      }
    }else if(station==='ball'){
      /* SPERRY BALL — the opaque source sphere hid the entire world from
         its center. Keep transparent glazing and construct the visible
         cast ribs explicitly around the supplied yoke and guns. */
      var ballGlass=new THREE.Mesh(new THREE.SphereGeometry(1.25,24,16),M.glass);
      g.add(ballGlass);
      for(var br=0;br<5;br++){
        var ballRib=torus(1.255,0.040,M.frame,Math.PI*1.72);
        ballRib.rotation.set(Math.PI/2,br*Math.PI/5,0);g.add(ballRib);
      }
      var ballArmor=box(0.18,0.58,0.72,M.frame);
      ballArmor.position.set(-0.92,0.28,0);g.add(ballArmor);
    }else{
      /* TAIL TURRET — open rear arc between the fins, armor ahead */
      var sk2=skinCanvas(1024,512);
      punch(sk2,0.13,0.25,0.37,0.85,[2,2]);  /* aperture faces station +x */
      punch(sk2,0.02,0.35,0.12,0.75);        /* side pane */
      punch(sk2,0.38,0.35,0.48,0.75);        /* side pane */
      var t2=new THREE.CylinderGeometry(1.4,1.4,2.2,24,1,true);
      var tw=new THREE.Mesh(t2,skinMat(sk2));
      g.add(tw);
      var lid=new THREE.Mesh(new THREE.CircleGeometry(1.4,24),capMat(skinCanvas(256,256)));
      lid.rotation.x=-Math.PI/2;lid.position.y=1.1;g.add(lid);
      var fl=new THREE.Mesh(new THREE.CircleGeometry(1.4,24),capMat(skinCanvas(256,256)));
      fl.rotation.x=Math.PI/2;fl.position.y=-1.1;g.add(fl);
    }
    /* twin .50 breeches + barrels toward the station facing */
    [-0.3,0.3].forEach(function(z){
      var breech=box(0.55,0.22,0.16,M.gun);breech.position.set(0.85,-0.18,z);g.add(breech);
      var barrel=cyl(0.05,0.06,2.1,M.gun,8);
      barrel.rotation.z=Math.PI/2;
      barrel.position.set(2.0,-0.14,z);g.add(barrel);
      var ammo=box(0.3,0.25,0.2,M.frame);ammo.position.set(0.55,-0.5,z*1.6);g.add(ammo);
    });
  }
  else if(station==='waistL'||station==='waistR'){
    /* WAIST — both rectangular openings, solid skin everywhere else */
    var sk3=skinCanvas(1024,512);
    punch(sk3,0.685,0.35,0.815,0.64);   /* right waist window (u .75) */
    punch(sk3,0.185,0.35,0.315,0.64);   /* left waist window  (u .25) */
    var tube3=tubeAlong(6.4,2.25,1.1,sk3);
    g.add(tube3);
    var fc3=capCanvas();
    fc3.g.fillStyle='#1d211c';fc3.g.fillRect(190,170,132,290);
    g.add(capAt(3.2,2.25,1.1,fc3,false));
    var ac3=capCanvas();
    ac3.g.fillStyle='#15181a';ac3.g.beginPath();ac3.g.arc(256,300,90,0,7);ac3.g.fill();
    g.add(capAt(-3.2,2.25,1.1,ac3,true));
    /* floor + ammo boxes + spent brass feel */
    var deck=box(6.2,0.08,1.6,M.frame);deck.position.set(0,-2.1,0);g.add(deck);
    [[-1.2,0.9],[0.8,-0.9],[1.8,0.6]].forEach(function(p2){
      var bx=box(0.5,0.35,0.35,M.canvasy);bx.position.set(p2[0],-1.9,p2[1]);g.add(bx);
    });
    /* the two pintle-mounted .50s, each in its own side window (plane space:
       +z = right waist window, −z = left) */
    [1,-1].forEach(function(sd){
      var post=cyl(0.06,0.07,0.95,M.metal);post.position.set(0,-1.65,sd*1.55);g.add(post);
      var recv=box(0.18,0.22,0.7,M.gun);recv.position.set(0,-0.95,sd*1.75);g.add(recv);
      var brl=cyl(0.05,0.06,1.9,M.gun,8);
      brl.rotation.x=sd>0?Math.PI/2-0.12:-(Math.PI/2-0.12);
      brl.position.set(0,-0.75,sd*2.85);g.add(brl);
      var belt=box(0.4,0.3,0.22,M.frame);belt.position.set(0.6,-1.7,sd*1.1);g.add(belt);
    });
  }
  else{ /* RADIO — the operator's cell behind the flight deck: full
           equipment wall, desk with key and log, padded walls */
    var sk4=skinCanvas(1024,512);
    punch(sk4,0.71,0.52,0.785,0.72);   /* right-side window */
    punch(sk4,0.215,0.52,0.29,0.72);   /* left-side window  */
    var tube4=tubeAlong(4.2,2.15,1.1,sk4);
    g.add(tube4);
    g.add(capAt(2.1,2.15,1.1,capCanvas(),false));
    var ac4=capCanvas();
    ac4.g.fillStyle='#22261f';ac4.g.fillRect(200,210,112,250); /* door aft */
    ac4.g.strokeStyle='#14161a';ac4.g.lineWidth=8;ac4.g.strokeRect(200,210,112,250);
    g.add(capAt(-2.1,2.15,1.1,ac4,true));
    /* quilted padding on the upper walls */
    var qT2=quiltCanvas();qT2.wrapS=qT2.wrapT=THREE.RepeatWrapping;qT2.repeat.set(2.4,1);
    var quilt2=new THREE.Mesh(
      new THREE.CylinderGeometry(2.06,2.06,3.4,24,1,true,Math.PI*0.18,Math.PI*0.64),
      new THREE.MeshStandardMaterial({map:qT2,roughness:0.95,metalness:0,side:THREE.BackSide}));
    quilt2.rotation.z=-Math.PI/2;quilt2.rotation.x=Math.PI/2;
    quilt2.position.set(0,0.1,0);g.add(quilt2);
    /* THE REAL RADIO ROOM: the photograph of the BC-348 station
       wrapped around the operator's working side */
photoWall(g,'https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2b3e21a99ce2fe9c7ebe6c_km-radio-photo.jpg',
      Math.atan2(0.707,-0.707),1.95,3.0,Math.PI*0.95,0.1,-0.15,0);
    /* glimpse of the flight deck through the forward bulkhead door
       (NMUSAF public-domain cockpit photograph) */
    (function(){
      var l2=new THREE.TextureLoader();l2.setCrossOrigin('anonymous');
      l2.load('https://cdn.prod.website-files.com/642b4bd98014250aa392775f/6a2b3e21018f4c9310f70f39_km-cockpit-photo.jpg',
        function(cTex){
          cTex.encoding=THREE.sRGBEncoding;
          var dr=new THREE.Mesh(new THREE.PlaneGeometry(1.05,1.45),
            new THREE.MeshBasicMaterial({map:cTex,color:0x8e958c}));
          dr.position.set(2.02,-0.35,0);dr.rotation.y=-Math.PI/2;
          g.add(dr);
        });
    })();
    var lampGlow=new THREE.PointLight(0xffd9a0,0.25,2.0);
    lampGlow.position.set(1.1,-0.65,0.85);g.add(lampGlow);
    /* operator's chair + oxygen bottles (the yellow-green B-24 cylinders) */
    var seat4=box(0.45,0.1,0.45,M.canvasy);seat4.position.set(0.1,-1.45,0.55);g.add(seat4);
    var back4=box(0.08,0.5,0.45,M.canvasy);back4.position.set(-0.12,-1.15,0.55);g.add(back4);
    var o2mat=new THREE.MeshStandardMaterial({color:0x6a7a40,roughness:0.5,metalness:0.5});
    [[-1.4,-1.2,-0.9],[-1.4,-1.2,-0.45],[-1.7,-0.4,-0.85]].forEach(function(pp){
      var bottle=cyl(0.14,0.14,0.7,o2mat,10);
      bottle.rotation.z=Math.PI/2;
      bottle.position.set(pp[0],pp[1],pp[2]);g.add(bottle);
    });
    /* wiring looms along the ceiling */
    for(var w2=0;w2<6;w2++){
      var loom=cyl(0.03+(w2%2)*0.015,0.03+(w2%2)*0.015,3.8,M.loom,6);
      loom.rotation.z=Math.PI/2;
      loom.position.set(0,1.72-(w2%3)*0.07,-0.55+w2*0.2);g.add(loom);
    }
    /* the green corrugated oxygen hose looping off the wall */
    var hose=torus(0.34,0.045,new THREE.MeshStandardMaterial({color:0x3c5b40,roughness:0.9}),Math.PI*1.3);
    hose.position.set(1.2,0.55,0.95);hose.rotation.y=Math.PI/2;g.add(hose);
  }

  /* dim cabin light so the structure reads against the bright sky */
  var lamp=new THREE.PointLight(0xffe6c0,0.22,8);
  lamp.position.set(-0.3,0.9,0);
  g.add(lamp);

  V2._interiors[station]=g;
  return g;
}

V2._hiddenOwnShip=[];
/* Block 7's old one-size-fits-all shell was still being inserted behind
   the new station system. It duplicated the cockpit at every location
   (the navigator literally saw the pilot panel) and was the source of
   the "people"/wrong-eyeline feel in the earlier build. V3 owns crew
   geometry completely, so keep that legacy shell inert. */
KM._showCrewInterior=function(){
  if(KM._interiorShell)KM._interiorShell.visible=false;
  KM._activeInterior=null;
};
KM._hideAllInteriors=function(){
  if(KM._interiorShell)KM._interiorShell.visible=false;
  KM._activeInterior=null;
};
V2.attachInterior=function(planeOverride){
  var c=KM._camState;
  if(!c||c.mode!=='crew'){V2.detachInterior();return false;}
  var plane=planeOverride||c.selectedPlane;
  var def=(V2.DETAIL_SEATS&&V2.DETAIL_SEATS[c.crewPos])||
    (KM._crewPositions?KM._crewPositions[c.crewPos]:null);
  if(!plane||!def||!plane.visible){V2.detachInterior();return false;}
  var station=c.crewPos||'pilot';
  var rebuilt;
  var cache=V2._cabinCache||(V2._cabinCache=new Map());
  if(window.KasselInterior){
    var room={copilot:'pilot',bomb:'nav',nose:'nav',waistR:'waistL'}[station]||station;
    rebuilt=cache.get(room);
    if(!rebuilt){
      try{rebuilt=window.KasselInterior.build(THREE,room);}
      catch(err){console.warn('KM: cabin build failed',err);return false;}
    }
    cache.delete(room);cache.set(room,rebuilt);
    if(rebuilt.group.parent===plane){c._intFor=plane;return true;}
  }
  V2.detachInterior();
  // The replacement is ready before masking the selected fuselage.
  if(rebuilt&&KM._ren&&window.KMCrewExterior){
    KM._ren.localClippingEnabled=true;
    V2._crewExterior=window.KMCrewExterior.attach(THREE,plane);
  }else{
    plane.children.forEach(function(ch){
      if(ch.visible){ch.visible=false;V2._hiddenOwnShip.push(ch);}
    });
  }
  c._intFor=plane;
  if(rebuilt){
    V2.DETAIL_SEATS=rebuilt.seats;
    plane.add(rebuilt.group);V2._intActive=[rebuilt.group];
    if(cache.size>2){
      var oldest=cache.keys().next().value;
      V2.disposeCabin(cache.get(oldest).group);
      cache.delete(oldest);
    }
    return true;
  }
  /* PREFERRED: the consolidated B-24 with its fully modeled cockpit —
     real instrument faces, real structure, real glazing. Lazy-loads on
     first crew view; the procedural enclosure covers the wait. */
  if(V2.loadDetailB24)V2.loadDetailB24();
  /* the modeled cockpit covers the flight deck; other stations keep
     their purpose-built enclosures */
  /* the detail model's nose and radio bay are HOLLOW — those stations
     use the photo-built rooms; the modeled cockpit covers the deck */
  var useDetail=true;
  if(useDetail&&V2.templates&&V2.templates.b24detail){
    if(!V2._detailHolder){
      V2._detailHolder=new THREE.Group();
      V2._detailHolder.userData.inspectionInterior=true;
      V2._detailHolder.add(V2.templates.b24detail.clone(true));
      var dl=new THREE.PointLight(0xffd9a8,0.38,14);
      dl.position.set(6,3,0);
      V2._detailHolder.add(dl);
      var dl2=new THREE.PointLight(0xc7d7ef,0.24,18);
      dl2.position.set(-4,2,0);
      V2._detailHolder.add(dl2);
    }
    plane.add(V2._detailHolder); /* same airframe frame as the ship */
    /* The supplied OBJ/GLB provides the actual frames, seats, tables,
       guns and equipment, but intentionally has no enclosing fuselage
       shell. Layer the station-specific glazing, padding, panels and
       photo-backed surfaces around it. This keeps the supplied geometry
       as the source of truth while making the view read as a finished
       aircraft interior rather than loose objects floating in the sky. */
    var enhanced=buildInterior(station);
    enhanced.userData.inspectionInterior=true;
    /* These legacy enclosures were authored at twice the native cabin
       dimensions. Keep their glazing at the supplied model's scale. */
    enhanced.scale.setScalar(V2.detailRoomScale||0.5);
    var pair={pilot:'copilot',copilot:'pilot',nav:'bomb',bomb:'nav'};
    var anchor={x:def.offset.x,y:def.offset.y,z:def.offset.z};
    var paired=pair[station]&&V2.DETAIL_SEATS&&V2.DETAIL_SEATS[pair[station]];
    if(paired){
      anchor={x:(def.offset.x+paired.offset.x)/2,
              y:(def.offset.y+paired.offset.y)/2,
              z:(def.offset.z+paired.offset.z)/2};
    }
    enhanced.position.set(anchor.x,anchor.y,anchor.z);
    var detailLook=def.look;
    var rotatingStation=(station==='nose'||station==='ttop'||station==='ball'||station==='tail');
    enhanced.rotation.set(0,rotatingStation?Math.atan2(-detailLook.z,detailLook.x):0,0);
    plane.add(enhanced);
    V2._intActive=[V2._detailHolder,enhanced];
    return;
  }
  var holder=buildInterior(station);
  holder.userData.inspectionInterior=true;
  /* shared compartments anchor at the COMPARTMENT center, not the
     individual eyepoint — pilot and co-pilot sit on opposite sides of
     the same deck and see genuinely different sightlines */
  var PAIR={pilot:'copilot',copilot:'pilot',nav:'bomb',bomb:'nav'};
  var anchor=def.offset;
  if(PAIR[station]&&KM._crewPositions[PAIR[station]]){
    var o2=KM._crewPositions[PAIR[station]].offset;
    anchor={x:(def.offset.x+o2.x)/2,y:(def.offset.y+o2.y)/2,z:(def.offset.z+o2.z)/2};
  }
  holder.position.set(anchor.x,anchor.y,anchor.z);
  /* the fuselage stays aligned with the AIRCRAFT — only turrets, which
     really did rotate with their gunner, take the look-direction yaw */
  var lk=def.look;
  var isTurret=(station==='ttop'||station==='ball'||station==='tail');
  holder.rotation.set(0,isTurret?Math.atan2(-lk.z,lk.x):0,0);
  plane.add(holder);
  V2._intActive=holder;
};
V2.disposeCabin=function(obj){
  /* compartment models share geometry with their cached templates */
  obj.children.filter(function(ch){return ch.userData.sharedCompartment;}).forEach(function(ch){obj.remove(ch);});
  var disposed=new Set();
  obj.traverse(function(o){
    if(o.geometry)o.geometry.dispose();
    if(o.material&&!disposed.has(o.material)){
      disposed.add(o.material);
      ['map','bumpMap','normalMap','roughnessMap'].forEach(function(k){
        var tx=o.material[k];
        if(tx&&!(tx.userData&&tx.userData.sharedCabinFinish)&&!disposed.has(tx)){
          disposed.add(tx);tx.dispose();
        }
      });
      o.material.dispose();
    }
  });
};
V2.detachInterior=function(){
  if(V2._crewExterior){
    V2._crewExterior.dispose();
    V2._crewExterior=null;
    KM._ren.localClippingEnabled=false;
  }
  var active=Array.isArray(V2._intActive)?V2._intActive:[V2._intActive];
  active.forEach(function(obj){
    if(obj&&obj.parent)obj.parent.remove(obj);
  });
  if(KM._camState)KM._camState._intFor=null;
  V2._intActive=null;
  V2._hiddenOwnShip.forEach(function(ch){ch.visible=true;});
  V2._hiddenOwnShip.length=0;
};
V2.updateStationOverlay=function(){};

/* ───────── view/crew/plane hooks ───────── */
(function(){
  function wrapUI(){
    if(window._kmV2UIWrapped||!KM.setView)return;
    window._kmV2UIWrapped=true;
    var oSetView=KM.setView,oSetCrew=KM.setCrewPos,oSelect=KM.selectPlane;
    /* the Aircraft picker and crew-station buttons only matter when you
       ride a specific ship — hide them in the overview views (orbit /
       follow / strategic) to declutter. */
    V2._syncSelectors=function(m){
      m=m||((document.getElementById('cp-view')||{}).value)||'orbit';
      var ap=document.getElementById('cp-plane');
      ap=(ap&&ap.closest)?ap.closest('.cp-sel'):null;
      var cw=document.getElementById('cp-crew-wrap');
      if(ap)ap.style.display=(m==='chase'||m==='crew')?'':'none';
      if(cw)cw.style.display=(m==='crew')?'':'none';
    };
    KM.setView=function(m){
      oSetView(m);
      var c=KM._camState;
      if(c){
        c.crewYaw=0;c.crewPitch=0;
        c._crewLossHandoff=false;
        if(m==='chase')c._chaseInit=false;
      }
      if(KM._cam&&m!=='crew'&&KM._cam.fov!==50){KM._cam.fov=50;KM._cam.updateProjectionMatrix();}
      if(KM._cam&&m==='crew'){KM._cam.fov=68;KM._cam.updateProjectionMatrix();}
      V2._syncSelectors(m);
      if(V2.attachInterior()===false&&c&&c.mode==='crew'){KM.setView('orbit');return;}
      if(V2.refreshCrewCaption)V2.refreshCrewCaption();
    };
    try{V2._syncSelectors();}catch(eSS){}
    KM.setCrewPos=function(p){
      /* no ball turret on the selected ship: that station did not exist */
      var selPd=KM._camState&&KM._camState.selectedPlane&&KM._camState.selectedPlane.userData&&KM._camState.selectedPlane.userData.planeData;
      if(p==='ball'&&selPd&&window.KasselAircraftDamage&&!window.KasselAircraftDamage.fit(selPd.pilot).ballTurret)return;
      oSetCrew(p);
      var c=KM._camState;if(c){c.crewPos=p;c.crewYaw=0;c.crewPitch=0;}
      if(V2.attachInterior()===false&&c&&c.mode==='crew'){KM.setView('orbit');return;}
      if(V2.refreshCrewCaption)V2.refreshCrewCaption();
    };
    KM.selectPlane=function(id){
      oSelect(id);
      var c=KM._camState;if(c){c._chaseInit=false;c._crewLossHandoff=false;c._followPlane=c.selectedPlane;}
      if(V2.refreshCrewCaption)V2.refreshCrewCaption();
      var pd=KM._planes?KM._planes[parseInt(id)]:null;
      var ft=document.getElementById('cp-info-fate');
      if(pd&&ft){
        var map={r:['SHOT DOWN','#e74c3c'],p:['CRASH-LANDED — ALLIED TERRITORY','#b07cc6'],
                 b:['EMERGENCY LANDING — ENGLAND','#5aa3d8'],g:['RETURNED TO TIBENHAM','#27ae60']};
        var m2=map[pd.fate]||['—','#999'];
        ft.textContent=m2[0];ft.style.color=m2[1];
        var sr=document.getElementById('cp-info-serial');
        if(sr)sr.textContent=(pd.acType||'B-24')+(pd.serial?' #'+pd.serial:'')+' · '+(pd.aircraftSq||pd.sq)+(pd.aircraftSq&&pd.aircraftSq!==pd.sq?' · '+pd.sq+' formation box':'');
      }
      /* No ball turret on this ship: the station did not exist on it. */
      var ballBtn=document.querySelector('.cp-crew-btn[data-pos="ball"]');
      if(ballBtn&&pd&&window.KasselAircraftDamage){
        var fitNow=window.KasselAircraftDamage.fit(pd.pilot);
        ballBtn.disabled=!fitNow.ballTurret;
        ballBtn.style.opacity=fitNow.ballTurret?'':'0.35';
        ballBtn.title=fitNow.ballTurret?'':(fitNow.h2xDome?'No ball turret: H2X radar dome fitted in its place':'Ball turret removed from this aircraft');
        if(!fitNow.ballTurret&&KM._camState&&KM._camState.crewPos==='ball'){KM.setCrewPos('waistL');return;}
      }
      if(KM._camState&&KM._camState.mode==='crew')V2.attachInterior();
    };
  }
  if(document.readyState!=='loading')wrapUI();
  else document.addEventListener('DOMContentLoaded',wrapUI);
})();

/* ───────── HUD cleanup + Return timeline mark ───────── */
(function(){
  function tidy(){
    var st=document.createElement('style');
    st.textContent=[
      '#cp-hud .cp-left{width:180px!important;max-width:180px!important}',
      '#cp-hud.crew-mode .cp-left{top:58px!important;left:12px!important;transform:none!important}',
      '#cp-hud .cp-sel{padding:6px 8px!important;margin-bottom:6px!important;background:rgba(6,8,12,.55)!important}',
      '#cp-hud .cp-sel label{font-size:8px!important;letter-spacing:.12em!important;margin-bottom:2px!important}',
      '#cp-hud .cp-sel select{font-size:10px!important;padding:4px 6px!important;width:100%!important}',
      '#cp-hud .cp-crew-btns{display:grid!important;grid-template-columns:1fr 1fr!important;gap:3px!important}',
      '#cp-hud .cp-crew-btn{font-size:8px!important;padding:3px 2px!important}',
      '#cp-hud .cp-phase{font-size:11px!important;max-width:52%!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '#cp-hud .cp-right{opacity:.92}',
      /* the base page staggers marks vertically to dodge label collisions —
         with our 7 relabeled marks that collision logic picks the wrong
         pair (Göttingen, Return Home) and drops them onto a second row,
         out of line with the rest. Pin every mark to one consistent row. */
      '.cp-tl-mark{top:15.8125px!important;white-space:nowrap!important}',
      '@media(max-width:768px){#cp-hud .cp-left{top:60px!important;bottom:auto!important;left:8px!important;right:auto!important;width:160px!important;max-width:160px!important}#cp-hud .cp-sel select{min-height:44px!important}#cp-hud .cp-crew-btn{min-height:44px!important;font-size:10px!important}#cp-hud .cp-btn,#cp-hud .cp-toggle{min-height:44px!important;padding:8px!important}.cp-controls{flex-wrap:wrap;gap:6px}.cp-top{flex-wrap:wrap;gap:5px}#sec-3d .kov-section-sub{font-size:11px;line-height:1.45}#km-station-cap{max-width:calc(100% - 16px)!important}}'
    ].join('\n');
    document.head.appendChild(st);
    var marks=document.querySelector('.cp-tl-marks');
    if(marks&&marks.children.length===6){
      var sp=document.createElement('span');
      sp.className='cp-tl-mark';
      marks.appendChild(sp);
    }
    /* the timeline tells the TRUE story — wrong turn included */
    var labels=['Tibenham','North Sea','Holland','IP — Nav Error','Göttingen','Battle','Return Home'];
    document.querySelectorAll('.cp-tl-mark').forEach(function(m,i){
      if(labels[i])m.textContent=labels[i];
      m.style.top='15.8125px';   /* belt-and-braces: also clear any inline
        offset the base script already applied before this ran */
    });
    /* a 24h military-time readout alongside altitude/speed, so the HUD
       gives some sense of how much real time each phase took (mission
       ran ~06:00 takeoff to ~12:42 return). The alt/speed stat boxes are
       page markup, not ours — clone the speed box's own structure/classes
       so the new readout matches the existing look without guessing at
       unrelated CSS. */
    if(!document.getElementById('cp-clock')){
      var spdEl=document.getElementById('cp-spd');
      var spdBox=spdEl&&spdEl.parentElement;
      var statRow=spdBox&&spdBox.parentElement;
      if(spdBox&&statRow){
        var clockBox=spdBox.cloneNode(true);
        clockBox.querySelectorAll('[id]').forEach(function(n){n.removeAttribute('id');});
        var valEl=clockBox.querySelector('*')||clockBox;
        valEl.id='cp-clock';
        valEl.textContent='08:00';
        var labelEl=clockBox.children[1];
        if(labelEl)labelEl.textContent='LOCAL';
        statRow.appendChild(clockBox);
      }
    }
  }
  if(document.readyState!=='loading')tidy();
  else document.addEventListener('DOMContentLoaded',tidy);
})();
/* ── per-crew rosters from the Participants CMS collection ── */
V2.CREW_SLUGS={"Chilton":"chilton","Uebelhoer":"uebelhoer","Seeds":"seeds","Mowat":"mowat","Mercer":"mercer","Johnson":"johnson","Isom":"isom","Hautman":"hautman","Fromm":"fromm","Elder":"elder","Bolin":"bolin","Warman":"warman","Sollien":"sollien","Schaen":"schaen","Potts":"potts","Miner":"miner","Krivik":"krivik","Jones":"jones","Donald":"donald","Brent":"brent","Baynham":"baynham","Walther":"walther","Swofford":"swofford","Smith":"smith","Reynolds":"reynolds","Golden":"golden","Dewey":"dewey","Bruland":"bruland","Pearson":"pearson","Hunter":"hunter","Heitz":"heitz","Hansen":"hansen","French":"french","Carrow":"carrow","Bruce":"bruce"};
V2.CREW_LISTS={
"Chilton":[{r:"Pilot",k:"Captain",n:"John H. Chilton",o:"KIA",s:"chilton",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e4d5_B1rogV9.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Harold E. Sutherland",o:"KIA",s:"sutherland"},{r:"Ball Turret Gunner",k:"S/Sgt",n:"Glen S. McCormick",o:"POW",s:"mccormick"},{r:"Bombardier",k:"1st Lt",n:"Parker S. Trefethen",o:"POW",s:"trefethen"},{r:"D/R Navigator",k:"1st Lt",n:"Raymond E. Ische",o:"MIA",s:"ische",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491d47881e8ed3e262943_Ray%2BIsche%2BAir%2BForce%2B1943.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Howard L. Sturdy",o:"POW",s:"sturdy"},{r:"Pilotage Navigator",k:"2nd Lt",n:"Carlton V. Hudson",o:"POW",s:"hudson"},{r:"Radar Navigator",k:"2nd Lt",n:"Cloys V. Johnson",o:"POW",s:"c-johnson"},{r:"Radio Operator",k:"T/Sgt",n:"William J. Sloane",o:"POW",s:"sloane"},{r:"Tail Gunner",k:"S/Sgt",n:"Donald W. Mills",o:"POW",s:"mills"},{r:"Waist Gunner",k:"S/Sgt",n:"Merle R. Briggs",o:"POW",s:"briggs"},{r:"Waist Gunner",k:"S/Sgt",n:"Robert E. Shay",o:"KIA",s:"r-shay",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a102_56660722_42315921-db94-4a26-84e3-5631bc971cbe.jpeg"},{r:"Wing Commander",k:"Major",n:"Don W. McCoy",o:"KIA",s:"mccoy"}],
"Uebelhoer":[{r:"Pilot",k:"Captain",n:"Web L. Uebelhoer",o:"Returned To Duty",s:"uebelhoer"},{r:"Co-Pilot",k:"1st Lt",n:"Billy B. Hart",o:"Returned To Duty",s:"hart"},{r:"Bombardier",k:"1st Lt",n:"Arthur Kugel",o:"Returned To Duty",s:"kugel"},{r:"D/R Navigator",k:"1st Lt",n:"Donald Whitefield",o:"Returned To Duty",s:"whitefield"},{r:"Deputy Group Commander",k:"Captain",n:"James Graham",o:"Returned To Duty",s:"j-graham"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Joseph Skomro",o:"Returned To Duty",s:"skomro"},{r:"Pilotage Navigator",k:"2nd Lt",n:"Mervin Scheu",o:"Returned To Duty",s:"scheu"},{r:"Radar Navigator",k:"2nd Lt",n:"James P. Fluer",o:"Returned To Duty",s:"fluer"},{r:"Radio Operator",k:"T/Sgt",n:"Robert L. Sims",o:"Returned To Duty",s:"sims"},{r:"Spare Gunner",k:"S/Sgt",n:"John C. Shinske",o:"Returned To Duty",s:"shinske"},{r:"Tail Gunner",k:"S/Sgt",n:"John S. Hubicz",o:"Returned To Duty",s:"hubicz"},{r:"Waist Gunner",k:"S/Sgt",n:"Santos C. Cabral",o:"Returned To Duty",s:"cabral"},{r:"Waist Gunner",k:"S/Sgt",n:"Haiq Mesrobian",o:"Returned To Duty",s:"mesrobian"}],
"Seeds":[{r:"Pilot",k:"2nd Lt",n:"Andrew G. Seeds",o:"KIA",s:"seeds",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e7cad12564074b88cd5_B1rnGEu.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Michael J. Luongo",o:"KIA",s:"luongo",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e17b8aa319e0da5944f_156252913_e537eb8a-cfc7-4d22-9f3a-cc88eb098c37.png"},{r:"Bombardier",k:"2nd Lt",n:"Joseph F. Sirl",o:"KIA",s:"sirl",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a0ef_22892824_1420087248.jpeg"},{r:"Engineer / Top Turret Gunner",k:"Sgt",n:"James M. Douglas",o:"KIA",s:"douglas",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e4dd_B1roYFa.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Thomas C. Bibb",o:"KIA",s:"bibb",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e4d2_B1roIwB.jpeg"},{r:"Radio Operator",k:"S/Sgt",n:"John E. Buch",o:"KIA",s:"buch-jr",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e4e1_B1ro1up.jpeg"},{r:"Tail Gunner",k:"Sgt",n:"Clare L. Wheeler",o:"KIA",s:"wheeler",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c324ad43c31b1eea5f_67129a119732ced93bf25213_wheeler.%25252BClare.jpeg"},{r:"Waist Gunner",k:"Sgt",n:"James J. Crowley",o:"KIA",s:"crowley",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c788234b26e74b9797_692f6b5f72b57538b242a4ed_Crowley_James_J_703rd_Seeds.jpeg"},{r:"Waist Gunner",k:"Sgt",n:"Sigmund Mischel",o:"KIA",s:"mischel",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da59427_56359880_b6b76b4a-bc99-44e4-8aeb-5be35d34afda.jpeg"}],
"Mowat":[{r:"Pilot",k:"1st Lt",n:"William J. Mowat",o:"KIA",s:"mowat",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c5b05e2d8a587b4004_66f984ad20d4e0b7cf028020_49261567_931348af-5882-4b4f-8c53-a346888e2d8b.png"},{r:"Co-Pilot",k:"2nd Lt",n:"Orville P. Smets",o:"KIA",s:"smets"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Theodore J. Myers",o:"POW",s:"myers"},{r:"Navigator / Bombardier",k:"F/O",n:"John L. Spingler",o:"KIA",s:"spingler"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"Sylvester V. Lello",o:"KIA",s:"lello"},{r:"Radio Operator",k:"T/Sgt",n:"Earl B. Groves",o:"KIA",s:"groves",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e4d9_B1ro6Ku.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Frank T. Plesa",o:"POW",s:"plesa"},{r:"Waist Gunner",k:"S/Sgt",n:"Everette L. Williams",o:"KIA",s:"e-williams",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a10a_25133888_0c448ae7-517b-4340-a9d7-444098fe9398.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"John B. Neher",o:"KIA",s:"neher-jr",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c4bf6524b21709f46b_66f985d806c7344f4be424c1_40010827_1482536735.jpeg"}],
"Mercer":[{r:"Pilot",k:"1st Lt",n:"Jackson C. Mercer",o:"Manston",s:"mercer"},{r:"Co-Pilot",k:"2nd Lt",n:"Leo P. Pouliot",o:"Manston",s:"pouliot"},{r:"Bombardier",k:"2nd Lt",n:"George Nooriqian",o:"Manston",s:"nooriqian"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Kenneth W. Kribs",o:"Manston",s:"kribs"},{r:"Navigator",k:"2nd Lt",n:"Milton Fandler",o:"Manston",s:"fandler"},{r:"Nose Gunner",k:"S/Sgt",n:"Ted E. Hoiten",o:"Manston",s:"hoiten"},{r:"Radio Operator",k:"T/Sgt",n:"Robert Bennet",o:"Manston",s:"bennet"},{r:"Tail Gunner",k:"S/Sgt",n:"Harry J. Lied",o:"Manston",s:"lied"},{r:"Waist Gunner",k:"S/Sgt",n:"Donald Selway",o:"Manston",s:"selway"},{r:"Waist Gunner",k:"S/Sgt",n:"Harry L. Wheaton",o:"Manston",s:"wheaton"}],
"Johnson":[{r:"Pilot",k:"1st Lt",n:"Joseph E. Johnson",o:"POW",s:"j-johnson"},{r:"Co-Pilot",k:"2nd Lt",n:"Edward M. Kelly",o:"POW",s:"kelly"},{r:"Bombardier",k:"1st Lt",n:"James E. Dowling",o:"POW",s:"dowling",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d83995a82a44886f7b6e1f_eDScukW.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Arthur P. Eisenman",o:"POW",s:"eisenman"},{r:"Navigator",k:"2nd Lt",n:"Herbert M. Bateman",o:"KIA",s:"bateman",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c399c248fd451b413b_692f69812674c4d0c94e8906_Bateman_Herbert_M_703rd_Johnson.jpeg"},{r:"Navigator / Nose Turret Gunner",k:"2nd Lt",n:"William E. Flickner",o:"KIA",s:"flickner",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd492_56655039_e1192bc4-f506-4645-aabe-546d59a2f98c.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Charles H. Reilly",o:"POW",s:"reilly"},{r:"Tail Gunner",k:"S/Sgt",n:"Floyd L. Jackson",o:"POW",s:"f-jackson"},{r:"Waist Gunner",k:"S/Sgt",n:"Alan M. Baldwin",o:"POW",s:"baldwin"},{r:"Waist Gunner",k:"S/Sgt",n:"Rubin J. Sisco",o:"POW",s:"sisco"}],
"Isom":[{r:"Pilot",k:"1st Lt",n:"Cecil Isom",o:"Returned",s:"isom"},{r:"Co-Pilot",k:"1st Lt",n:"Lonnie Justus",o:"Returned",s:"justus"},{r:"Bombardier",k:"1st Lt",n:"Wayne Sprague",o:"Returned To Duty",s:"sprague"},{r:"Engineer",k:"T/Sgt",n:"Edward Barnes",o:"Returned",s:"barnes"},{r:"Navigator",k:"1st Lt",n:"Arthur Shay",o:"Returned",s:"a-shay"},{r:"Navigator",k:"1st Lt",n:"Jay Heisel",o:"Returned",s:"heisel"},{r:"Radio Operator",k:"T/Sgt",n:"John J. Reinman",o:"Returned",s:"reinman"},{r:"Tail Gunner",k:"S/Sgt",n:"Raymond Phillips",o:"Returned",s:"phillips"},{r:"Top Turret Gunner",k:"S/Sgt",n:"Kyle C. Bailey",o:"Returned",s:"k-bailey"},{r:"Waist Gunner",k:"S/Sgt",n:"Paul Dickerson",o:"Returned",s:"dickerson"},{r:"Waist Gunner",k:"S/Sgt",n:"W E. Wagner",o:"Returned",s:"wagner"}],
"Hautman":[{r:"Pilot",k:"1st Lt",n:"Edward F. Hautman",o:"MIA",s:"hautman",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491e97504121e6ec0cfad_1st%2BLt.%2BEdward%2BHautman%2Bformal.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Carrol G. Snidow",o:"POW",s:"snidow",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d93cc2848ff42dc98960ce_BGIlzbe.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Thomas W. Land",o:"POW",s:"land",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491eb61bbe5de2483e763_Thomas%2BV.%2BLand.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Maynard L. Jones",o:"POW",s:"m-jones",img:"https://uploads-ssl.webflow.com/642b4bd980142546e792776e/645491ebe3c85a210c7aebec_image-asset.png"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"Dale C. Maupin",o:"POW",s:"maupin",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491ec123c05b617ea47c1_Dale%2BC.%2BMaupin.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Harold W. Giesler",o:"POW",s:"giesler",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491e97564d427fca560b7_image-asset.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Gordon F. Waldron",o:"KIA",s:"waldron",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491ee9330fe92df3a1fca_image-asset.jpeg"},{r:"Waist Gunner",k:"T/Sgt",n:"Orvel G. Howe",o:"POW",s:"howe",img:"https://uploads-ssl.webflow.com/642b4bd980142546e792776e/645491eaa3b4ea55676c11a6_Orvel%2BHowe.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"John A. Tarbert",o:"KIA",s:"tarbert",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491ed29c8312d72052c23_John%2BA.%2BTarbert.jpeg"}],
"Fromm":[{r:"Pilot",k:"1st Lt",n:"Richard A. Fromm",o:"POW",s:"fromm"},{r:"Co-Pilot",k:"2nd Lt",n:"Edward A. Globis",o:"KIA",s:"globis",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd478_131687893_9a650add-69b7-4a91-914a-6d3c6fac4370.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Russell C. Lene",o:"POW",s:"lene"},{r:"Navigator / Bombardier",k:"1st Lt",n:"Charles B. McCann",o:"POW",s:"mccann"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"Raymond E. Bence",o:"POW",s:"bence-jr",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cdf8130131576bd63d_692f69d6399d4d0ca6d9c7de_Bence_Raymond_E_703rd_Fromm.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Joseph J. Rackis",o:"POW",s:"rackis"},{r:"Tail Gunner",k:"S/Sqt",n:"Lee H. Coffin",o:"POW",s:"coffin",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bba17c7d1dc61bf749_692f6b1b43c709e5110de340_Coffin_Lee_H_703rd_Fromm.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Joseph F. Williams",o:"POW",s:"j-williams"},{r:"Waist Gunner",k:"S/Sgt",n:"William N. Brower",o:"POW",s:"w-brower"}],
"Elder":[{r:"Pilot",k:"1st Lt",n:"Oliver B. Elder",o:"KIA",s:"elder",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e4e5_B1roXPn.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Roy E. Ellender",o:"POW",s:"ellender"},{r:"Bombardier",k:"2nd Lt",n:"Charles Vergos",o:"KIA",s:"vergos",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a0fc_36175818_135191416839.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Paul E. Devries",o:"POW",s:"devries"},{r:"Navigator",k:"1st Lt",n:"Harold P. Whidden",o:"POW",s:"whidden-jr"},{r:"Radio Operator",k:"T/Sgt",n:"John J. Donahue",o:"KIA",s:"donahue",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d86e8b80a58bb6b498e515_B1roNSf.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Stanley H. Morse",o:"KIA",s:"morse",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bebb1af037d640b31e_6712bf916c43c97f2cb003ed_26202573_1ded2079-f970-4532-96dc-13c236ce35e5.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Charles J. Deckert",o:"POW",s:"deckert-jr"},{r:"Waist Gunner",k:"S/Sgt",n:"John L. Durr",o:"POW",s:"durr"}],
"Bolin":[{r:"Pilot",k:"2nd Lt",n:"Roy E. Bolin",o:"KIA",s:"bolin",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c498c8d389bbe7d9e7_692f6a679e638af87d7fac37_Bolin_Roy_E_703rd_Bolin.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Laurence G. Barben",o:"KIA",s:"barben"},{r:"Bombardier",k:"2nd Lt",n:"Truman Armstrong",o:"KIA",s:"armstrong-jr"},{r:"Engineer / Top Turret Gunner",k:"Sgt",n:"Charles E. Weatherly",o:"KIA",s:"weatherly",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c435072a58977d062c_6712c21d0c7fcf8155dbf426_39985481_d6430bf5-c286-43fa-b804-68e39f38bb04.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Louis P. Ajello",o:"KIA",s:"ajello",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bd8429bcbe21a390bd_6712f2ebdf0ecfa07f1cacec_14581992_8b7808e9-5064-4c4f-ac28-bd568aa66509.jpeg"},{r:"Radio Operator",k:"S/Sgt",n:"William Aaron",o:"KIA",s:"aaron"},{r:"Tail Gunner",k:"Sgt",n:"Orland J. Schooley",o:"POW",s:"schooley"},{r:"Waist Gunner",k:"Sgt",n:"Tage R. Frederiksen",o:"KIA",s:"frederiksen",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd482_156222459_c0cd6076-6495-4b03-b764-a4e684833185.png"},{r:"Waist Gunner",k:"Sgt",n:"Robert W. Oleson",o:"KIA",s:"oleson",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c4a7090801406300ff_6712f5d98de441cf7727c86f_39985416_1099c756-4f59-4b6b-8ab4-b629a52f5711.jpeg"}],
"Warman":[{r:"Pilot",k:"2nd Lt",n:"Leslie E. Warman",o:"KIA",s:"warman",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cd9dfe24b44d20d1a6_6712f1cd543a23c79acb4dca_88378182_efab9d5f-20fb-4af2-adff-104cbf3a2ff1.png"},{r:"Co-Pilot",k:"2nd Lt",n:"Robert C. Johnston",o:"KIA",s:"johnston"},{r:"Engineer / Top Turret Gunner",k:"S/Sgt",n:"Wilbur E. Brown",o:"POW, Stalag 9c",s:"wilbur-brown"},{r:"Navigator",k:"2nd Lt",n:"Francis W. Costley",o:"KIA",s:"costley",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c717fc26dea2958a9d_692f6b36912788469bd76f4e_Costley_Francis_W_702nd_Warman.png"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"Francis R.E. Barnish",o:"POW, Stalag Luft IV",s:"barnish"},{r:"Radio Operator",k:"S/Sgt",n:"Douglas P. Smith",o:"KIA",s:"douglas-smith"},{r:"Tail Gunner",k:"S/Sgt",n:"Raymond W. Ray",o:"POW, Stalag Luft IV",s:"ray"},{r:"Waist Gunner",k:"S/Sgt",n:"Carl W. Forster",o:"KIA",s:"forster",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd47f_56655103_87399dd9-311e-4a40-a9e6-ea48ff9ca592.png"},{r:"Waist Gunner",k:"S/Sgt",n:"Charles G. Pakestein",o:"KIA",s:"pakestein"}],
"Sollien":[{r:"Pilot",k:"1st Lt",n:"Carl J. Sollien",o:"POW, Stalag Luft I",s:"sollien"},{r:"Co-Pilot",k:"2nd Lt",n:"William H. Koenig",o:"KIA",s:"koenig",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da5942d_56657190_1473693419.jpeg"},{r:"Bombardier",k:"1st Lt",n:"Malcolm J. MacGregor",o:"POW O698023",s:"macgregor"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"William C. Stephens",o:"KIA",s:"stephens"},{r:"Navigator",k:"2nd Lt",n:"Wesley L. Hudelson",o:"POW, Stalag Luft I",s:"hudelson"},{r:"Pilotage Navigator",k:"2nd Lt",n:"John D. Dent",o:"KIA",s:"dent"},{r:"Radio Operator",k:"T/Sgt",n:"Charles J. Graham",o:"POW, Stalag Luft IV",s:"c-graham"},{r:"Tail Gunner",k:"S/Sgt",n:"Amml H. Miller",o:"POW, Stalag Luft IV",s:"miller"},{r:"Waist Gunner",k:"S/Sgt",n:"James L. Bridgeo",o:"KIA",s:"bridgeo"},{r:"Waist Gunner",k:"S/Sgt",n:"Robert C. Imhoff",o:"KIA",s:"imhoff",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d83799c3af701351b89b23_yUPGKYn.jpeg"}],
"Schaen":[{r:"Pilot",k:"1st Lt",n:"James W. Schaen",o:"KIA",s:"schaen",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a10f_49308974_c2975e2a-b1bf-4c8e-87c1-71092802dc96.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Bobby C. McGough",o:"POW, Stalag Luft III",s:"mcgough"},{r:"Bombardier",k:"2nd Lt",n:"George M. Collar",o:"POW, Stalag Luft I",s:"collar",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cc2aa45b7ef256b1f3_692f6b27e8e318bc0f340d10_Collar_George_M_702nd_Schaen.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"George S. Eppley",o:"POW, Stalag Luft IV",s:"eppley"},{r:"Navigator",k:"2nd Lt",n:"Corman H. Bean",o:"POW, Stalag Luft I",s:"bean",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d83b20f69931b330ffef43_XoC42YU.jpeg"},{r:"Radio Operator",k:"T/Sqt",n:"Robert L. Collins",o:"POW, Stalag Luft IV",s:"collins"},{r:"Tail Gunner",k:"S/Sgt",n:"Brian J. Hurt",o:"KIA",s:"hurt",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cc472fc2fe53c97ea5_6712c0c0f7deadeef062c0c1_75673484_6c0ac570-d2fd-4cba-836f-705dc35936fd.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Edward J. Johnson",o:"KIA",s:"e-johnson"},{r:"Waist Gunner",k:"S/Sgt",n:"Richard L. Parsons",o:"KIA",s:"parsons",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da59442_154638146_56626b3b-1c0e-4a14-aa78-bc73a222d511.jpeg"}],
"Potts":[{r:"Pilot",k:"2nd Lt",n:"Herbert Potts",o:"KIA",s:"potts",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da59436_56302825_101841ff-3196-43b6-b545-550f0bd99cc3.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Gerald J. Kathol",o:"POW, Stalag 9c",s:"kathol"},{r:"Bombardier",k:"2nd Lt",n:"James R. Freybler",o:"KIA",s:"freybler",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd469_87393211_86897eed-173b-49f2-b71c-dcf0cdcc89f5.jpeg"},{r:"Engineer / Top Turret Gunner",k:"Sgt",n:"Henry Broadway",o:"KIA",s:"broadway-jr",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c69932ae6b28c746f9_692f6ac9ede25df46686fcac_Broadway_Henry_702nd_Potts.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Dale F. Zornow",o:"KIA",s:"zornow",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a0eb_67183484_1490057683.jpeg"},{r:"Radio Operator",k:"Sgt",n:"Ernest J. Biasetti",o:"POW, Stalag Luft IV",s:"biasetti"},{r:"Tail Gunner",k:"Sgt",n:"Rogers Silverman",o:"POW, Stalag Luft IV",s:"silverman"},{r:"Waist Gunner",k:"Sgt",n:"Olin D. Johnson",o:"KIA",s:"o-johnson"},{r:"Waist Gunner",k:"Sgt",n:"Roger L. Scott",o:"POW, Stalag Luft III",s:"scott"}],
"Miner":[{r:"Pilot",k:"1st Lt",n:"Reginald R. Miner",o:"POW, Stalag Luft I",s:"miner"},{r:"Co-Pilot",k:"1st Lt",n:"Virgil Chima",o:"KIA",s:"chima",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86be68cfcc68c4b7019c_692f6b0f4f965ddfd3094a28_Chima_Virgil_702nd_Miner.jpeg"},{r:"Bombardier",k:"1st Lt",n:"John V. Omick",o:"POW, Stalag 9c",s:"omick"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Robert M. Ault",o:"POW, Stalag Luft III",s:"ault"},{r:"Navigator",k:"1st Lt",n:"Frank J. Bertram",o:"POW, Stalag Luft I",s:"bertram",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bcf7c335a3878efdfb_658fbe87e6a0f7d59f6bf9cb_IMG_0295.jpeg"},{r:"Pilotage Navigator",k:"2nd Lt",n:"Charles W. Jackson",o:"POW, Stalag Luft I",s:"c-jackson"},{r:"Radar Navigator",k:"2nd Lt",n:"Branch H. Henard",o:"POW, Stalag Luft I",s:"henard-jr"},{r:"Radio Operator",k:"S/Sgt",n:"Joseph H. Gilfoil",o:"KIA",s:"gilfoil"},{r:"Tail Gunner",k:"S/Sgt",n:"Alvis O. Kitchens",o:"POW, Stalag 9c",s:"kitchens"},{r:"Waist Gunner",k:"S/Sgt",n:"Lawrence S. Bowers",o:"POW, Stalag Luft IV",s:"bowers"},{r:"Waist Gunner",k:"S/Sgt",n:"Arthur W. Lamberson",o:"POW, Stalag Luft IV",s:"lamberson"},{r:"Waist Gunner",k:"S/Sgt",n:"Mertis \"Mac\" C. Thornton",o:"POW 34623735",s:"thornton-jr"}],
"Krivik":[{r:"Pilot",k:"1st Lt",n:"Stanley E. Krivik",o:"Returned To Duty",s:"krivik"},{r:"Co-Pilot",k:"2nd Lt",n:"Leonard R. Trotta",o:"Returned To Duty",s:"trotta"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Donald R. Bugalecki",o:"Returned To Duty",s:"bugalecki"},{r:"Navigator",k:"F/O",n:"Daniel Dale",o:"KIA",s:"dale",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c671316713ae411322_692f6b682b0e04c3eae8f0a7_Dale_Daniel_702nd_Krivik.jpeg"},{r:"Nose Gunner",k:"S/Sgt",n:"Clifford N. Stromberg",o:"Returned To Duty",s:"stromberg"},{r:"Radio Operator",k:"T/Sgt",n:"John V. Cadden",o:"Old Buck",s:"cadden",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c2751db8887176d862_658fba19d4ddcb4f4d7bb7b3_129606742677339520.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Henry A. Puto",o:"Returned To Duty",s:"puto"},{r:"Waist Gunner",k:"S/Sgt",n:"James R. Paul",o:"Returned To Duty",s:"paul"},{r:"Waist Gunner",k:"S/Sgt",n:"William Rand",o:"Returned To Duty",s:"rand"}],
"Jones":[{r:"Pilot",k:"2nd Lt",n:"Howard A. Jones",o:"POW",s:"h-jones"},{r:"Co-Pilot",k:"2nd Lt",n:"Harold P. Allen",o:"KIA",s:"h-allen",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c8d29729d259e3110a_692f690fa06f0ee2c9cec8db_Allen_Harold_P_702nd_Jones.jpeg"},{r:"Bombardier",k:"2nd Lt",n:"Joseph A. Wilski",o:"POW, Stalag Luft I",s:"wilski"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Andrew Fratta",o:"KIA",s:"fratta"},{r:"Navigator",k:"2nd Lt",n:"Robert Fulton",o:"POW O716408",s:"fulton"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"Milton H. Lee",o:"POW, Stalag Luft IV",s:"lee"},{r:"Radio Operator",k:"T/Sgt",n:"William C. Stremme",o:"POW, Stalag Luft IV",s:"stremme"},{r:"Tail Gunner",k:"S/Sgt",n:"Raymond J. Paulus",o:"KIA",s:"r-paulus",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da59445_2893890_dbfe88dc-aa68-4cba-9d09-8984c1d5a92c.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Willis A. Meier",o:"POW, Stalag Luft I",s:"meier"},{r:"Waist Gunner",k:"S/Sgt",n:"Warren B. Pendleton",o:"POW, Stalag Luft I",s:"pendleton"}],
"Donald":[{r:"Pilot",k:"1st Lt",n:"Myron H. Donald",o:"KIA",s:"donald",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c8114b4ca2d7d9c02a_692f6bb32a48591984567752_Donald_Myron_H_702nd_Donald.png"},{r:"Co-Pilot",k:"2nd Lt",n:"Eric C. Smith",o:"POW, Stalag Luft I",s:"e-smith-jr"},{r:"Co-Pilot",k:"2nd Lt",n:"Frank C. Smith",o:"POW, Stalag Luft I",s:"f-smith"},{r:"Bombardier",k:"1st Lt",n:"Ira P. Weinstein",o:"POW, Stalag Luft I",s:"weinstein"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Anthony Kielar",o:"KIA",s:"kielar"},{r:"Radio Operator",k:"T/Sgt",n:"Jack B. Stidham",o:"POW, Stalag Luft IV",s:"stidham"},{r:"Tail Gunner",k:"S/Sgt",n:"Lawrence A. Modlin",o:"KIA",s:"modlin",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da5943f_3660889_b4beccfa-dfed-498f-9529-d185e23054f9.png"},{r:"Waist Gunner",k:"S/Sgt",n:"James L. McEntee",o:"KIA",s:"mcentee"},{r:"Waist Gunner",k:"S/Sgt",n:"Walter J. Walston",o:"KIA",s:"walston"}],
"Brent":[{r:"Pilot",k:"1st Lt",n:"Donald E. Brent",o:"KIA",s:"brent",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c70169ecab3b4c4d4e_6712a912d6a28d0aafbc58e2_brent%2520collage.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Walter E. George",o:"POW, Stalag Luft I",s:"w-george"},{r:"Bombardier",k:"2nd Lt",n:"Harold H. Mercier",o:"KIA",s:"mercier"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Constantine Galuszewski",o:"POW 32583006e",s:"galuszewski"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"George B. Linkletter",o:"KIA",s:"linkletter",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da59405_56301069_baaf506c-0227-441c-befc-5397a518e9d4.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Sammy S. Weiner",o:"POW, Stalag Luft IV",s:"weiner"},{r:"Rail Gunner",k:"S/Sgt",n:"Woodard C. Watts",o:"KIA",s:"watts"},{r:"Waist Gunner",k:"S/Sgt",n:"Donald W. Larsen",o:"KIA",s:"d-larsen",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86ba92961f6af797ec46_6618bde2ada9205c7eca3033_post-49147-0-39975200-1356674023.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Milton C. Smisek",o:"KIA",s:"smisek"}],
"Baynham":[{r:"Pilot",k:"1st Lt",n:"James C. Baynham",o:"POW, Stalag Luft I",s:"baynham"},{r:"Co-Pilot",k:"2nd Lt",n:"Charles M. Bousquet",o:"POW O817621",s:"bousquet",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86ca96f20c732963387c_692f6a850fa449a915f45582_Bousquet_Charles_M_702nd_Baynham.jpeg"},{r:"Bombardier",k:"2nd Lt",n:"Hektor V. Scala",o:"KIA",s:"scala"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Howard L. Boldt",o:"POW, Stalag 9c",s:"boldt"},{r:"Navigator",k:"2nd Lt",n:"John W. Cowgill",o:"KIA",s:"cowgill",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c84c33631962ee04c2_692f6b56c981476660804cc7_Cowgill_John_W_702nd_Baynham.png"},{r:"Radio Operator",k:"T/Sgt",n:"James T. Fields",o:"KIA",s:"fields",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d821181c600396bc448401_zzq6ts.png"},{r:"Tail Gunner",k:"S/Sgt",n:"John W. Knox",o:"POW, Stalag 9c",s:"knox"},{r:"Waist Gunner",k:"S/Sgt",n:"Olen C. Byrd",o:"KIA",s:"byrd",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c7927d3058bd4ed062_692f6ae82a27c7fd72f3dc8b_Byrd_Olen_C_702nd_Baynham.png"},{r:"Waist Gunner",k:"S/Sgt",n:"John R. Lemons",o:"POW, Stalag Luft IV",s:"lemons-jr"}],
"Walther":[{r:"Pilot",k:"1st Lt",n:"Edgar N. Walther",o:"POW, Stalag 9c",s:"walther",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d897cf8e1312048d9fe688_B1bzDQ9.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Martin Geiszler",o:"KIA",s:"geiszler-jr"},{r:"Bombardier",k:"2nd Lt",n:"John J. Becker",o:"KIA",s:"becker",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81d54b4150ecee8ff7a13_90790241_5ba74ca9-823d-4164-9080-99322dd53c81.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Richard W. Vernor",o:"KIA",s:"vernor",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a117_111961271_ce23f5d3-ff58-4ab1-92c0-cdd6c955099b.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Ross B. Brower",o:"KIA",s:"r-brower",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bc343b5297674bd7cd_692f6ad2160fabef430cd0e9_Brower_Ross_B_701st_Walther.jpeg"},{r:"Navigator / Nose Turret Gunner",k:"2nd Lt",n:"Kenneth L. Meeks",o:"KIA",s:"meeks"},{r:"Radio Operator",k:"T/Sgt",n:"Glenn R.A. Bergquist",o:"KIA",s:"bergquist",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cb88234b26e74b97fa_692f69dd6d5bbff5d019733f_Bergquist_Glenn_RA_701st_Walther.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Milo R. Mann",o:"KIA",s:"mann",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e16b8aa319e0da59431_6817428_59db9496-67c1-4749-aecb-047ce014ec15.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Norman A. Hollis",o:"KIA",s:"hollis",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd47b_143867489_d4ddc56a-8fcd-44fb-bb82-314d28c8434a.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"John F. Wise",o:"KIA",s:"wise",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a0e7_24195179_4193f30d-5484-40de-bff2-eafee8eb5e33.jpeg"}],
"Swofford":[{r:"Pilot",k:"1st Lt",n:"Paul Swofford",o:"Returned To Duty",s:"swofford",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d888299d0c7b1be2caeb6e_B1shJAg.jpeg"},{r:"Co-Pilot",k:"1st Lt",n:"Ward A. Smith",o:"Returned To Duty",s:"w-smith"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Phillip Vosburgh",o:"Returned To Duty",s:"vosburgh"},{r:"Navigator",k:"F/O",n:"Henry W. Dobek",o:"Returned To Duty",s:"dobek",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c5d805800537cf22a8_692f6ba371630137d0289621_Dobek_Henry_W_701st_Swofford.jpeg"},{r:"Nose Gunner",k:"S/Sgt",n:"Marvin Deshazer",o:"Returned To Duty",s:"deshazer"},{r:"Radio Operator",k:"T/Sgt",n:"Eugene F. Thum",o:"Returned To Duty",s:"thum"},{r:"Tail Gunner",k:"S/Sgt",n:"Joseph V. Waller",o:"Returned To Duty",s:"waller"},{r:"Waist Gunner",k:"S/Sgt",n:"Willard R. Dykes",o:"Returned To Duty",s:"dykes",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c0e5f55c66951b19c5_692f68c372b57538b2421e10_Dykes_Willard_R_701st_Swofford.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Timothy Pimpinelli",o:"Returned To Duty",s:"pimpinelli"}],
"Smith":[{r:"Co-Pilot",k:"2nd Lt",n:"Adolph F. Lerch",o:"Returned To Duty",s:"lerch"},{r:"Bombardier",k:"1st Lt",n:"Clarence H. Smith",o:"Returned To Duty",s:"c-smith-jr"},{r:"Pilot",k:"1st Lt",n:"Donald H. Smith",o:"Returned To Duty",s:"donald-smith"},{r:"D/R Navigator",k:"2nd Lt",n:"Wiliam O. Carpenter",o:"Returned To Duty",s:"carpenter"},{r:"Engineer / Top Turret Gunner",k:"S/Sgt",n:"Lonnie O. Davis",o:"Returned To Duty",s:"davis",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bf2256620220de7957_692f6b72ce7131b5dba78824_Davis_Lonnie_O_701st_Smith.jpeg"},{r:"Nose Gunner",k:"1st Lt",n:"Anthony Capuano",o:"Returned To Duty",s:"capuano"},{r:"Radio Operator",k:"S/Sgt",n:"William R. Klinefelter",o:"Returned To Duty",s:"klinefelter"},{r:"Tail Gunner",k:"Sgt",n:"Eldon E. Gray",o:"Returned To Duty",s:"e-gray"},{r:"Waist Gunner",k:"Sgt",n:"Curtis V. Cowart",o:"Returned To Duty",s:"cowart"},{r:"Waist Gunner",k:"Sgt",n:"Jack Laswell",o:"Returned To Duty",s:"laswell"}],
"Reynolds":[{r:"Pilot",k:"2nd Lt",n:"Donald N. Reynolds",o:"POW, Stalag Luft I",s:"reynolds"},{r:"Co-Pilot",k:"2nd Lt",n:"Herbert T. Robinson",o:"POW, Stalag Luft I",s:"robinson"},{r:"Engineer / Top Turret Gunner",k:"S/Sgt",n:"James T. Engleman",o:"POW, Stalag Luft IV",s:"engleman",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/67ad76a4cb6483a9bf7c7be5_image-1.png"},{r:"Navigator / Bombardier",k:"1st Lt",n:"James T. Withey",o:"POW, Stalag Luft I",s:"withey"},{r:"Nose Turret Gunner",k:"Sgt",n:"Robert M. Long",o:"KIA",s:"long",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bbbf6524b21709f388_67ad76d60cd024e19c4666d7_image-2.png"},{r:"Radio Operator",k:"S/Sgt",n:"Robert C. Sheehan",o:"POW, Stalag Luft IV",s:"sheehan"},{r:"Tail Gunner",k:"Sgt",n:"Harry G. Twigg",o:"POW, Stalag Luft IV",s:"twigg"},{r:"Waist Gunner",k:"Sgt",n:"Maynard R. Danner",o:"POW, Stalag Luft IV",s:"danner"},{r:"Waist Gunner",k:"Sgt",n:"Lars E. Larsen",o:"KIA",s:"l-larsen",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d8891e4b53fbf15a537bc6_B1ssoNf.jpeg"}],
"Golden":[{r:"Pilot",k:"2nd Lt",n:"William F. Golden",o:"KIA",s:"golden"},{r:"Co-Pilot",k:"2nd Lt",n:"Robert C. Christie",o:"POW, Stalag Luft I",s:"christie"},{r:"Bombardier",k:"2nd Lt",n:"Theodore C. Boecher",o:"POW, Stalag Luft III",s:"boecher",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bef11a9e6b4b2c1b49_692f6a5cf95837a4cd477351_Boecher_Theodore_C_701st_Golden.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Earl C. Romine",o:"POW, Stalag Luft IV",s:"romine",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d8891e4b53fbf15a537bca_B1ssqSn.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Edmund F. Boomhower",o:"POW, Stalag Luft I",s:"boomhower"},{r:"Radio Operator",k:"S/Sgt",n:"Jack M. Erickson",o:"POW, Stalag Luft IV",s:"erickson",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d888299d0c7b1be2caeb62_B1sh2DJ.jpeg"},{r:"Tail Gunner",k:"Sgt",n:"Norman J. Stewart",o:"KIA",s:"stewart",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81e2fb8aa319e0da5a0f5_56375752_1479714570.jpeg"},{r:"Waist Gunner",k:"Sgt",n:"Robert R. Bagley",o:"POW, Stalag Luft IV",s:"bagley"},{r:"Waist Gunner",k:"Sgt",n:"Edward H. Feltus",o:"POW, Stalag Luft IV",s:"feltus"}],
"Dewey":[{r:"Pilot",k:"2nd Lt",n:"William R. Dewey",o:"Returned To Duty",s:"dewey",img:"https://uploads-ssl.webflow.com/642b4bd980142546e792776e/658fbcdb64fab3a729b4b29d_Dewey%2Bat%2Bthe%2Bcockpit%2Bof%2Bthe%2BSweetest%2BRose%2Bof%2BTexas%2BOperation%2BVarsity.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"William L. Boykin",o:"Returned To Duty",s:"boykin",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c72aa45b7ef256b12a_692f6a9505c94d938b8012c2_Boykin_William_L_701st_Dewey.jpeg"},{r:"Engineer / Top Turret Gunner",k:"S/Sgt",n:"Charles O. Craig",o:"Returned To Duty",s:"craig"},{r:"Navigator",k:"2nd Lt",n:"Herbert E. Bailey",o:"Returned To Duty",s:"h-bailey",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c891ce990dc9165894_692f697346f1eb815fb3399e_Bailey_Herbert_E_701st_Dewey.png"},{r:"Nose Gunner",k:"Sgt",n:"Leslie Medlock",o:"Returned To Duty",s:"medlock"},{r:"Radio Operator",k:"S/Sgt",n:"John E. Ellson",o:"Returned To Duty",s:"ellson"},{r:"Tail Gunner",k:"Sgt",n:"Reuben A. Montanez",o:"Returned To Duty",s:"montanez"},{r:"Waist Gunner",k:"Sgt",n:"Walter J. Bartkow",o:"Returned To Duty",s:"bartkow"},{r:"Waist Gunner",k:"Sgt",n:"George Johnson",o:"Returned To Duty",s:"g-johnson"}],
"Bruland":[{r:"Pilot",k:"2nd Lt",n:"Palmer M. Bruland",o:"POW",s:"bruland",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bdbd77182b4aca9457_658fbd2fa3821306301ef3fa_Palmer%252BM.%252BBruland.jpeg"},{r:"Co-Pilot",k:"2nd Lt",n:"Peter S. Belitsos",o:"POW",s:"belitsos",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491cb9330fe43cb3a18ab_Cadet%2BBelitsos.jpeg"},{r:"Engineer / Top Turret Gunner",k:"S/Sgt",n:"Stephen J. Gray",o:"POW, Stalag Luft IV",s:"s-gray",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d884268aa1920bdd804928_B1ih7Bp.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Norman J. Cuddy",o:"POW, Stalag Luft IV",s:"cuddy",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d884268aa1920bdd804925_B1iha4I.jpeg"},{r:"Nose Turret Gunner",k:"Sgt",n:"Ferdinand K. Flach",o:"KIA",s:"flach",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d8378f2eff82a149a80fbe_wC8EV2s.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"James H. Boman",o:"POW 39557815",s:"boman",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bf536123256da7077c_6623ee2c927f948729de0c53_tempImageqHgW78.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Charles M. Dove",o:"POW, Stalag Luft IV",s:"dove",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cc4535e03d0e3676e4_692f6bcb139109a45c59424e_Dove_Charles_M_701st_Bruland.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Lee R.J. Huffman",o:"KIA",s:"huffman"},{r:"Waist Gunner",k:"S/Sgt",n:"Hugh J. Sullivan",o:"POW 39115320",s:"sullivan"}],
"Pearson":[{r:"Pilot",k:"1st Lt",n:"Ralph H. Pearson",o:"POW, Stalag Luft I",s:"pearson"},{r:"Co-Pilot",k:"2nd Lt",n:"Nelson L. Dimick",o:"POW, Stalag Luft I",s:"dimick",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bbf21b4717a5c15942_692f6b7bd1ead10c0ffa247e_Dimick_Nelson_L_700th_Pearson.jpeg"},{r:"Bombardier",k:"F/O",n:"Henry J. Henrikson",o:"KIA",s:"henrikson",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d81deeb4150ecee8ffd461_56358710_30088653-bb49-419a-8e60-d6abced49736.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Robert D. Johnson",o:"KIA",s:"r-johnson"},{r:"Navigator",k:"2nd Lt",n:"Arthur E. Stearns",o:"KIA",s:"stearns",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86badd874ba95c6f2bef_6712aa9fe6fe0612d182a1b6_Stearns.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Doye L. O'Keefe",o:"POW, Stalag Luft IV",s:"okeefe",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/64549204e3c85a18c07aec41_1590346132544-9P7F5R16CBYUTNKDYBNX.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Dwight F. Galyon",o:"POW, Stalag Luft IV",s:"galyon"},{r:"Waist Gunner",k:"S/Sgt",n:"John M. Loving",o:"POW, Stalag Luft IV",s:"loving"},{r:"Waist Gunner",k:"S/Sgt",n:"Harry F. Tachovsky",o:"POW, Stalag Luft IV",s:"tachovsky"}],
"Hunter":[{r:"Pilot",k:"1st Lt",n:"William F. Hunter",o:"Returned To Duty",s:"hunter"},{r:"Co-Pilot",k:"2nd Lt",n:"L D. Ferryman",o:"Returned To Duty",s:"ferryman"},{r:"Bombardier",k:"2nd Lt",n:"George E. Smith",o:"Returned To Duty",s:"g-smith"},{r:"Engineer",k:"S/Sgt",n:"Robert H. Ratchford",o:"Returned To Duty",s:"ratchford"},{r:"Navigator",k:"2nd Lt",n:"R H. Keams",o:"Returned To Duty",s:"keams"},{r:"Photographer-Observer",k:"S/Sgt",n:"Thomas G. Spera",o:"Returned To Duty",s:"spera"},{r:"Radio Operator",k:"S/Sgt",n:"Jake S. Monzinqo",o:"Returned To Duty",s:"monzinqo"},{r:"Tail Gunner",k:"S/Sgt",n:"Fred C. Schaffer",o:"Returned To Duty",s:"schaffer"},{r:"Top Turret Gunner",k:"Sgt",n:"Robert W. Sarber",o:"Returned To Duty",s:"sarber"},{r:"Waist Gunner",k:"S/Sgt",n:"Robert J. Cannon",o:"Returned To Duty",s:"cannon",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c681cbfe57682fcdf6_692f6af1564114dabbf40387_Cannon_Robert_J_700th_Hunter.jpeg"},{r:"Waist Gunner",k:"Sgt",n:"Joseph A. Selser",o:"Returned To Duty",s:"selser"}],
"Heitz":[{r:"Pilot",k:"1st Lt",n:"Raymond V. Heitz",o:"Returned To Duty",s:"heitz"},{r:"Co-Pilot",k:"2nd Lt",n:"Harold T. Vedera",o:"Returned To Duty",s:"vedera"},{r:"Bombardier",k:"2nd Lt",n:"Edward J. Drake",o:"Returned To Duty",s:"drake"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Homer P. Harrison",o:"Returned To Duty",s:"harrison"},{r:"Navigator",k:"2nd Lt",n:"John F. Leary",o:"Returned To Duty",s:"leary"},{r:"Radio Operator",k:"T/Sgt",n:"Fabian S. Mack",o:"Returned To Duty",s:"mack"},{r:"Tail Gunner",k:"S/Sgt",n:"Maynard B. Watson",o:"Returned To Duty",s:"watson"},{r:"Waist Gunner",k:"S/Sgt",n:"Louis Ochevsky",o:"KIA",s:"ochevsky"},{r:"Waist Gunner",k:"S/Sgt",n:"Elroy W. Palm",o:"Returned To Duty",s:"palm"}],
"Hansen":[{r:"Pilot",k:"2nd Lt",n:"Robert N. Hansen",o:"MIA",s:"hansen"},{r:"Co-Pilot",k:"2nd Lt",n:"Herbert C. Bridges",o:"POW, Stalag Luft I",s:"bridges-jr",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d8379a62980d6c3868b572_1ymOeae.jpeg"},{r:"Bombardier",k:"2nd Lt",n:"John C. Woodley",o:"POW",s:"woodley",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491e78db9a61819d608c9_John%2BC%2BWoodley_Uniform%2BPortrait.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Charles C. Palmer",o:"KIA",s:"palmer-jr"},{r:"Navigator",k:"2nd Lt",n:"Porter M. Pile",o:"KIA",s:"pile",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86cb3881702eeecb9f62_6618bf2c91f871e53eeda9cf_132292249_web1_Porter-Pile.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"James M. Triplett",o:"KIA",s:"triplett",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d82a06f56e076ed7cf8403_251520875_f0cdae73-191a-471d-ac1a-1026dd1e75a6.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Ralph H. Bode",o:"KIA",s:"bode",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bff8cb7fb2e722c39c_66c7dfbd222a71f67f31c89e_20240819_142632.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Elwyn J. Hornsby",o:"POW",s:"hornsby"},{r:"Waist Gunner",k:"S/Sgt",n:"S E. Howell",o:"KIA",s:"howell"}],
"French":[{r:"Pilot",k:"1st Lt",n:"John E. French",o:"Returned To Duty",s:"french",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bc312dbdc3d59b31a2_658fbcf9720c2702e45d91aa_Jack%252BFrench.jpeg"},{r:"Co-Pilot",k:"1st Lt",n:"Robert D. Cochran",o:"Returned To Duty",s:"cochran",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d8710d2d6591bfe913d531_B1r4TMb.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"William L. Jacobs",o:"Returned To Duty",s:"jacobs"},{r:"Navigator",k:"F/O",n:"Robert T. Tims",o:"Returned To Duty",s:"tims",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c5076c7628b00007c3_658fbef5237aa7cdad053e24_image-asset-8.jpeg"},{r:"Nose Gunner",k:"S/Sgt",n:"David A. Greenly",o:"Returned To Duty",s:"greenly",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/69d8710d2d6591bfe913d534_B1r4aHB.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Fred N. Fiske",o:"Returned To Duty",s:"fiske"},{r:"Tail Gunner",k:"S/Sgt",n:"Herbert R. Schwartz",o:"Returned To Duty",s:"schwartz",img:"https://uploads-ssl.webflow.com/642b4bd980142546e792776e/645491df320f4e4f17bb6787_image-asset.png"},{r:"Waist Gunner",k:"S/Sgt",n:"James E. Corman",o:"Returned To Duty",s:"corman",img:"https://uploads-ssl.webflow.com/642b4bd980142546e792776e/645491dd13dde1b745d9add2_image-asset.jpeg"},{r:"Waist Gunner",k:"S/Sgt",n:"Charles A. Huddleston",o:"Returned To Duty",s:"huddleston"}],
"Carrow":[{r:"Pilot",k:"1st Lt",n:"Raphael E. Carrow",o:"POW, Stalag Luft I",s:"carrow",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c251b600fb9c61f6e7_658fba58237aa7cdad02c5ea_Raphael%252BCarrow.png"},{r:"Co-Pilot",k:"2nd Lt",n:"Newell W. Brainard",o:"KIA",s:"brainard",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491d09330fe29423a1e83_Newell%252BBrainard%252Bhead%252Bshot.png"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Louis T. Tocket",o:"KIA",s:"tocket",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bbab13129c548a3144_6712c3608dfe44c6f48d7ab4_114020706_751fac09-d09f-4361-ab15-82b397463b24.png"},{r:"Navigator / Bombardier",k:"2nd Lt",n:"George R. Austin",o:"KIA",s:"austin",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86ca9e3bdcbf79eb69c2_6712f6868f6bad32704311b2_60628588_3d89f093-4fde-4c9a-bebd-5941240df3b0.jpeg"},{r:"Nose Turret Gunner",k:"S/Sgt",n:"Victor J. Panconi",o:"KIA",s:"panconi",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491d36bc448acb6dfcd71_1455499489194-WY9ETP6T6OC09K4I8ANE.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Roy A. Belouski",o:"KIA",s:"belouski",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86ccf8130131576bd5ec_692f69c75eeccf429f4a98e6_Belouski_Roy_A_700th_Carrow.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Herbert A. Ledin",o:"POW, Stalag Luft IV",s:"ledin"},{r:"Waist Gunner",k:"S/Sgt",n:"Nicholas H. Dengler",o:"POW",s:"dengler"},{r:"Waist Gunner",k:"S/Sgt",n:"Charles W. Loether",o:"POW, Stalag Luft IV",s:"loether"}],
"Bruce":[{r:"Pilot",k:"2nd Lt",n:"William S. Bruce",o:"Ob Hospital, Transferred To Luft III",s:"bruce",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c10b54ea962118df5d_658fbed0237aa7cdad051e1c_William%252BBruce%252C%252Bpilot.png"},{r:"Co-Pilot",k:"1st Lt",n:"John P. Willett",o:"KIA",s:"willet-jr",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491c96fbb78e63bc41242_John.jpeg"},{r:"Bombardier",k:"2nd Lt",n:"Daniel H. Appleton",o:"KIA",s:"appleton",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86c8015ffd03f79dc940_692f6958c47d449718cd5349_Appleton_Daniel_H_700th_Bruce.jpeg"},{r:"Engineer / Top Turret Gunner",k:"T/Sgt",n:"Calvin F. Hess",o:"KIA",s:"hess",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491c738243d237c1c0064_Calvin%252BHess%252C%252Bleft.jpeg"},{r:"Navigator",k:"2nd Lt",n:"Daniel A. Abraham",o:"KIA",s:"abraham",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/692f86bbaa8307e89b088b7c_66a1e0b7f6c8995a85a3f858_119664009_138800066395.jpeg"},{r:"Radio Operator",k:"T/Sgt",n:"Peter Pogovich",o:"POW, Stalag Luft IV",s:"pogovich",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491c842b5d6701f32935c_1456774029348-OBFK1OOACGXE3R9BKS1H.jpeg"},{r:"Tail Gunner",k:"S/Sgt",n:"Glenn H. Shaffer",o:"KIA",s:"shaffer"},{r:"Waist Gunner",k:"S/Sgt",n:"William J. Fleming",o:"KIA",s:"fleming",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491c6f01dda866bd60177_Bruce%252C%252BPaulus%252Band%252BFleming%252Blook%252Bat%252Bstabilizer.png"},{r:"Waist Gunner",k:"S/Sgt",n:"Fred A. Paulus",o:"KIA",s:"f-paulus",img:"https://cdn.prod.website-files.com/642b4bd980142546e792776e/645491c77881e8cdd626260b_1454553731880-KC9Y0YKT408IYWIWWVDJ.jpeg"}]
};
/* ───────────────── INTEGRATION / POST-UPGRADE ───────────────── */

/* Upgrade the particle systems the formation block created, and
   remove the old flat cloud planes. */
V2.postUpgrade=function(){
  var scene=KM._s;if(!scene)return;
  var soft=V2.softTex();
  function findPoints(geo){
    var hit=null;
    scene.traverse(function(c){if(c.isPoints&&c.geometry===geo)hit=c;});
    return hit;
  }
  if(KM._smoke){
    var sm=findPoints(KM._smoke.geo);
    if(sm){sm.material.dispose();sm.material=new THREE.PointsMaterial({
      map:soft,color:0x3a3b40,size:9,transparent:true,opacity:0.5,
      depthWrite:false,blending:THREE.NormalBlending});}
  }
  if(KM._fire){
    var fr=findPoints(KM._fire.geo);
    if(fr){fr.material.dispose();fr.material=new THREE.PointsMaterial({
      map:soft,color:0xff7a33,size:5,transparent:true,opacity:0.65,
      depthWrite:false,blending:THREE.AdditiveBlending});}
  }
  if(KM._flakGeo&&KM._flakMat){
    var fk=findPoints(KM._flakGeo);
    if(fk){
      var newMat=new THREE.PointsMaterial({
        map:soft,color:0x494438,size:8,transparent:true,opacity:0.35,
        depthWrite:false,blending:THREE.NormalBlending});
      fk.material.dispose();fk.material=newMat;KM._flakMat=newMat;
    }
  }
  /* remove v1 flat cloud planes (3000×2100 translucent slabs) */
  var doomed=[];
  scene.children.forEach(function(c){
    if(c.isMesh&&c.geometry&&c.geometry.type==='PlaneGeometry'&&
       (Math.abs(c.position.y-160)<1||Math.abs(c.position.y-200)<1)&&
       c.material&&c.material.transparent&&c.material.opacity<=0.08){
      doomed.push(c);
    }
  });
  doomed.forEach(function(c){scene.remove(c);});

  /* tone down the oversized waypoint spheres + rings the formation
     block places along the route (they loom huge in crew views) */
  scene.children.forEach(function(c){
    if(c.isMesh&&c.geometry&&c.geometry.type==='SphereGeometry'&&
       c.geometry.parameters&&Math.abs(c.geometry.parameters.radius-5)<0.01){
      c.scale.set(0.45,0.45,0.45);
      if(c.material)c.material.transparent=true,c.material.opacity=0.75;
    }
    if(c.isMesh&&c.geometry&&c.geometry.type==='RingGeometry'&&
       c.userData&&c.userData.phase!==undefined){
      if(c.material)c.material.opacity=0.15;
    }
  });

  /* contrail system for the battle scene */
  V2._battleTrails=V2.makeContrails(scene,6000);
  V2.installPicking();
  V2.installStationCaption();
  console.log('KM v2: post-upgrade applied');
};

/* ── click a ship to follow it (raycast; ignores drags) ── */
V2.installPicking=function(){
  var canvas=KM._canv;
  if(!canvas||canvas._v2pick)return;canvas._v2pick=true;
  var ray=new THREE.Raycaster(),m=new THREE.Vector2(),down=null;
  canvas.addEventListener('pointerdown',function(e){down=[e.clientX,e.clientY];});
  canvas.addEventListener('pointerup',function(e){
    if(!down)return;
    var moved=Math.abs(e.clientX-down[0])+Math.abs(e.clientY-down[1]);
    down=null;
    if(moved>6||!KM._cam||!KM._fp)return;
    var r=canvas.getBoundingClientRect();
    m.x=((e.clientX-r.left)/r.width)*2-1;
    m.y=-((e.clientY-r.top)/r.height)*2+1;
    ray.setFromCamera(m,KM._cam);
    ray.params.Points={threshold:0};
    var ships=(KM._fp||[]).concat(KM._b24&&KM._b24.visible?[KM._b24]:[])
      .filter(function(p){return p.visible;});
    var hits=ray.intersectObjects(ships,true);
    if(!hits.length)return;
    var o=hits[0].object,ship=null;
    while(o){if(ships.indexOf(o)>=0){ship=o;break;}o=o.parent;}
    if(!ship)return;
    /* the simulator addresses ships by userData.id — array index is
       NOT the id (that mismatch made clicks select the wrong crew) */
    var id=ship.userData&&ship.userData.id;
    if(id==null)return;
    if(KM.selectPlane)KM.selectPlane(id);
    var vs=document.getElementById('cp-view');
    if(vs&&vs.value!=='crew'&&vs.value!=='chase'){
      vs.value='chase';vs.dispatchEvent(new Event('change',{bubbles:true}));
    }
    if(KM._camState)KM._camState._chaseInit=false; /* re-frame astern */
  });
};

/* ── crew-station caption: whose seat you're in, ship, fate ── */
V2.STATION_NAMES={pilot:"PILOT'S SEAT",copilot:"CO-PILOT'S SEAT",
  nav:"NAVIGATOR'S TABLE",bomb:"BOMBARDIER'S STATION",nose:"NOSE TURRET GUNNER",
  ttop:"MARTIN TOP TURRET",
  ball:"SPERRY BALL TURRET",waistL:"LEFT WAIST GUN",waistR:"RIGHT WAIST GUN",
  tail:"TAIL TURRET",radio:"RADIO OPERATOR'S DESK"};
V2.installStationCaption=function(){
  if(V2._capTimer)return;
  var wrap=KM._cont||document.getElementById('terrain-wrap');
  if(!wrap)return;
  var el=document.createElement('div');
  el.id='km-station-cap';
  el.addEventListener('error',function(event){
    if(event.target.tagName==='IMG')event.target.hidden=true;
  },true);
  /* top-right, clear of the play button and scrubber */
  el.style.cssText='position:absolute;right:12px;top:64px;z-index:30;text-align:right;'+
    'font:600 11px/1.5 "Oswald",sans-serif;letter-spacing:0.08em;'+
    'color:#e8e4d8;background:rgba(10,11,13,0.72);border:1px solid rgba(255,196,1,0.35);'+
    'padding:7px 12px;border-radius:3px;display:none;pointer-events:none;max-width:44%';
  if(getComputedStyle(wrap).position==='static')wrap.style.position='relative';
  wrap.appendChild(el);
  V2.refreshCrewCaption=function(){
    var c=KM._camState;
    var info=document.getElementById('cp-info');
    if(!c||(c.mode!=='crew'&&c.mode!=='chase')){
      el.style.display='none';
      if(info)info.style.visibility='';
      return;
    }
    /* show the ship the camera is ACTUALLY following — when your ship
       goes down and the view hands off, the caption hands off too */
    var p=c._followPlane||c.selectedPlane,
        pd=p&&p.userData&&p.userData.planeData;
    if(!pd){el.style.display='none';if(info)info.style.visibility='';return;}
    /* the caption replaces the old info card (it repeats the same
       facts) — hide it while the caption is up */
    if(info)info.style.visibility='hidden';
    var fate={r:'SHOT DOWN',p:'REACHED ALLIED TERRITORY',b:'DIVERTED TO ENGLAND',g:'RETURNED TO TIBENHAM'}[pd.fate]||'';
    var chutes=pd.chuteCount?(' · '+pd.chuteCount+' DEPICTED BAILOUTS'):'';
    /* The highlighted control is the public source of truth. A legacy
       closure could briefly retain `pilot` after a rapid plane/view/
       station switch, making a correct nose-gunner view say PILOT'S
       SEAT. Resolve the current station from the active control first. */
    var activeStationBtn=document.querySelector('.cp-crew-btn.active');
    var stationKey=(c.mode==='crew'&&activeStationBtn&&activeStationBtn.dataset.pos)||c.crewPos;
    var head=(c.mode==='crew'||c._crewLossHandoff)
      ?(V2.STATION_NAMES[stationKey]||String(stationKey||'').toUpperCase())
      :'FOLLOWING';
    var ship=(pd.p||pd.name||pd.pilot||'?');
    var sq=(pd.aircraftSq||pd.sq)?String(pd.aircraftSq||pd.sq).toUpperCase()+' SQ':'';
    var serial=pd.serial?(pd.type||'B-24')+' #'+pd.serial:'';
    /* THE MAN IN THIS SEAT — from the Participants CMS collection */
    var airman='',aSlug='',aImg='',stationVacant='';
    if((c.mode==='crew'||c._crewLossHandoff)&&V2.CREW_LISTS){
      var list=V2.CREW_LISTS[String(ship)]||[];
      var resolution=KMCrewStations.resolve(list,stationKey);
      {
        var pick=resolution.member;
        if(pick){
          airman=((pick.k?pick.k+' ':'')+pick.n).toUpperCase();
          if(pick.o)airman+=' · '+String(pick.o).toUpperCase();
          aSlug=pick.s||'';aImg=pick.img||'';
          if(resolution.uncertain)stationVacant=/^waist/.test(stationKey)?'WAIST SIDE NOT SPECIFIED IN THE ROSTER':'MULTIPLE CREWMEN LISTED FOR THIS ROLE';
        }else if(stationKey==='ball')stationVacant='NO BALL-TURRET CREWMAN IDENTIFIED IN THIS ROSTER';
        else stationVacant='STATION ASSIGNMENT UNKNOWN';
      }
    }
    /* clickable: airman → participant page, crew → crew page; the
       airman's CMS photo rides along when there is one */
    var crewSlug=(V2.CREW_SLUGS&&V2.CREW_SLUGS[String(ship)])||'';
    // Where several people share a role, retain all recorded names in
    // the expandable roster without presenting the first as identified.
    if(resolution&&resolution.uncertain){
      airman='';aSlug='';aImg='';
    }
    var roleHtml=airman&&pick&&pick.r?'<span class="station-role">'+String(pick.r)+'</span>':'';
    var airHtml=airman
      ?(aSlug
        ?'<a href="https://kasselmission.org/participant/'+aSlug+'" style="color:#fff;text-decoration:underline" target="_blank" rel="noopener">'+airman+'</a>'
        :'<span style="color:#fff">'+airman+'</span>')
      :'';
    var crewHtml='CREW OF '+(crewSlug
      ?'<a href="https://kasselmission.org/crews/'+crewSlug+'" style="color:#e8e4d8;text-decoration:underline" target="_blank" rel="noopener">'+String(ship).toUpperCase()+'</a>'
      :String(ship).toUpperCase());
    var bigPhoto=(c.mode==='crew'&&aImg)
      ?'<img src="'+aImg+'" style="float:right;width:44px;'+
       'height:52px;object-fit:cover;object-position:top;margin:0 0 5px 8px;'+
       'border:1px solid rgba(255,196,1,0.55);border-radius:3px" alt="">'
      :'';
    var fullList=(V2.CREW_LISTS&&V2.CREW_LISTS[String(ship)])||[];
    var rosterHtml=fullList.length?('<details style="margin-top:8px;padding-top:6px;border-top:1px solid rgba(255,255,255,.14);text-align:left">'+
      '<summary style="cursor:pointer;color:#FFC401;font-size:9px">FULL AIRCRAFT CREW · '+fullList.length+'</summary>'+
      '<div style="margin-top:6px;max-height:31vh;overflow:auto;font:500 9px/1.45 Montserrat,sans-serif;letter-spacing:.01em">'+
      fullList.map(function(m){return '<div style="margin-bottom:5px"><span style="color:#fff">'+
        ((m.k?m.k+' ':'')+m.n).toUpperCase()+'</span><br><span style="opacity:.64">'+
        String(m.r||'').toUpperCase()+' · '+String(m.o||'UNKNOWN').toUpperCase()+'</span></div>';}).join('')+
      '</div></details>'):'';
    var bailoutHtml=(pd.bailoutCrew&&pd.bailoutCrew.length&&KM._battleT>=(pd.fateTime||0))
      ?('<details style="margin-top:6px;text-align:left"><summary style="cursor:pointer;color:#d9dedf;font-size:9px">NAMED BAILOUTS · '+pd.bailoutCrew.length+'</summary><div style="margin-top:4px;font:500 9px/1.45 Montserrat,sans-serif">'+
        pd.bailoutCrew.map(function(m){var evidence=V2.bailoutEvidenceFor(String(ship),m);
          return '<div style="margin-bottom:7px">'+String(m.n||'').toUpperCase()+' · '+String(m.r||'').toUpperCase()+
            (evidence?'<div style="margin-top:2px;opacity:.78;text-transform:none">'+evidence+'<br><span style="opacity:.65">Source: Reg Miner interview with Aaron Elson, April 11, 1999.</span></div>':'')+'</div>';
        }).join('')+'</div></details>'):'';
    var caption=bigPhoto+
      (airHtml?('<span style="font-size:15px;line-height:1.35">'+airHtml+'</span><br>'):'')+
      roleHtml+(stationVacant?('<span style="color:#d6c9a4;font-size:10px">'+stationVacant+'</span><br>'):'')+
      '<span style="opacity:0.78;font-size:10px">'+crewHtml+
      (sq?(' · '+sq):'')+(serial?(' · '+serial):'')+'</span>'+
      (fate?('<br><span style="color:'+(pd.fate==='r'?'#ff7a66':'#9fd49a')+'">'+fate+chutes+'</span>'):'')+
      (pd.lossNote&&KM._battleT>=(pd.fateTime||0)&&KM._missionT>=BATTLE_START?('<br><span style="display:inline-block;margin-top:4px;opacity:.66;font:500 9px/1.35 Montserrat,sans-serif;letter-spacing:.01em">'+pd.lossNote.toUpperCase()+'</span>'):'')+
      bailoutHtml+rosterHtml;
    if(c.mode==='crew'){
      caption='<details class="station-record"><summary class="station-title">'+head+' · '+String(ship).toUpperCase()+'</summary>'+caption+'</details>';
    }else caption='<span class="station-title">'+head+'</span>'+caption;
    if(el._crewCaption!==caption){
      var keepOpen=el.firstElementChild&&el.firstElementChild.open;
      el.innerHTML=caption;
      if(keepOpen&&el.firstElementChild.tagName==='DETAILS')el.firstElementChild.open=true;
      el._crewCaption=caption;
    }
    el.style.maxWidth='min(290px, 44%)';
    el.style.maxHeight='calc(100% - 150px)';
    el.style.overflow='auto';
    el.style.pointerEvents='auto';
    el.style.display='block';
    var snapshot=document.getElementById('cp-crew-snapshot');
    if(snapshot)snapshot.classList.remove('show');
  };
  V2._capTimer=setInterval(V2.refreshCrewCaption,400);
  V2.refreshCrewCaption();
};

/* ───────────────────── CONTRAILS ───────────────────── */
V2.makeContrails=function(scene,count){
  var geo=new THREE.BufferGeometry();
  var pos=new Float32Array(count*3);
  for(var i=0;i<count;i++){pos[i*3]=-99999;pos[i*3+1]=-99999;pos[i*3+2]=-99999;}
  geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
  var pts=new THREE.Points(geo,new THREE.PointsMaterial({
    map:V2.softTex(),color:0xe6ecf4,size:.24,transparent:true,
    opacity:0.18,depthWrite:false,blending:THREE.NormalBlending}));
  pts.frustumCulled=false;
  scene.add(pts);
  return {geo:geo,pos:pos,count:count,next:0,frame:0,
    age:new Float32Array(count)};
};
V2.emitContrail=function(sys,plane,engines){
  var q=plane.quaternion,s=plane.scale.x||1;
  var now=KM._simSeconds||0;
  for(var e=0;e<engines.length;e++){
    var off=engines[e].clone().multiplyScalar(s).applyQuaternion(q);
    var i=sys.next;sys.next=(sys.next+1)%sys.count;
    sys.pos[i*3]=plane.position.x+off.x+(Math.random()-0.5)*.045;
    sys.pos[i*3+1]=plane.position.y+off.y+(Math.random()-0.5)*.045;
    sys.pos[i*3+2]=plane.position.z+off.z+(Math.random()-0.5)*.045;
    sys.age[i]=now;
  }
  sys.geo.attributes.position.needsUpdate=true;
};
/* trails dissipate — no more orphaned contrail segments hanging in
   the sky long after the aircraft has moved on (or scrubbed away) */
V2.ageContrails=function(sys,maxAge){
  if(!sys||!sys.age)return;
  var now=KM._simSeconds||0,dirty=false;
  for(var i=0;i<sys.count;i++){
    if(sys.age[i]>0&&now-sys.age[i]>(maxAge||16)){
      sys.age[i]=0;
      sys.pos[i*3]=-99999;sys.pos[i*3+1]=-99999;sys.pos[i*3+2]=-99999;
      dirty=true;
    }
  }
  if(dirty)sys.geo.attributes.position.needsUpdate=true;
};
var ENGINE_OFFS=[
  new THREE.Vector3(2.0,1.5,-12),new THREE.Vector3(2.0,1.3,-6),
  new THREE.Vector3(2.0,1.3,6),new THREE.Vector3(2.0,1.5,12)
];

/* ───────────────── V2 AMBIENT LOOP ─────────────────
   Runs alongside the original render loop: cloud drift, water
   scroll, contrail emission, route-explorer scene. */
V2.startLoop=function(){
  if(V2._loopStarted)return;V2._loopStarted=true;
  var last=performance.now(),frames=0;
  function loop(){
    requestAnimationFrame(loop);
    var now=performance.now();
    var dt=Math.min((now-last)/1000,0.05);last=now;
    frames++;
    var sdt=KM._playing?dt:0;
    V2.driftClouds(sdt);
    V2.scrollWater(sdt);
    /* keep crew-station instrument needles alive */
    if(V2._stationCanvas&&V2._stationCanvas.style.display==='block'&&(frames%24)===0){
      V2.updateStationOverlay();
    }
    /* battle-scene contrails above ~15k ft */
    var sys=V2._battleTrails;
    if(sys&&KM._playing&&KM._missionT>0.45&&KM._missionT<0.985){
      sys.frame++;
      if(sys.frame%3===0){
        var all=(KM._fp||[]).concat(KM._b24?[KM._b24]:[]);
        for(var i=0;i<all.length;i++){
          var p=all[i];
          if(p.visible&&p.userData&&p.userData.alive!==false){
            V2.emitContrail(sys,p,ENGINE_OFFS);
          }
        }
      }
    }
    if(sys&&(frames%30)===0)V2.ageContrails(sys,8);
    if(V2.route)V2.route.tick(dt);
  }
  loop();
};

/* ───────────── ROUTE EXPLORER (second scene) ─────────────
   Rebuilds the original "Flight Path Explorer" section as its own
   cinematic scene: real terrain, a single squadron flying the route,
   three camera modes. */
V2.initRoute=function(){
  if(V2.route)return;
  var wrap=document.getElementById('route-wrap');
  var canvas=document.getElementById('route-canvas');
  if(!wrap||!canvas)return;
  var w=wrap.clientWidth||800,h=wrap.clientHeight||500;

  var scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(V2.FOG_COLOR,0.00042);
  var camera=new THREE.PerspectiveCamera(50,w/h,1,9000);
  camera.position.set(0,520,820);
  var renderer=new THREE.WebGLRenderer({canvas:canvas,antialias:true});
  renderer.setSize(w,h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5));
  renderer.outputEncoding=THREE.sRGBEncoding;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.08;

  V2.applyLighting(scene);
  V2.buildSky(scene);
  V2.buildTerrainMesh(scene);
  V2.buildWater(scene);
  V2.buildClouds(scene);
  var route=V2.buildRoute(scene);
  V2.loadDEM().then(function(){
    V2.addGeoLabels(scene);
    V2.addCrashSites(scene,true);
  }).catch(function(){
    V2.addGeoLabels(scene);
    V2.addCrashSites(scene,true);
  });

  /* a 13-ship squadron box */
  var planes=[];
  var offs=[[0,0,0],
    [-10,-1.5,-14],[-10,1.5,14],[-20,3,26],[-20,-3,-26],
    [-26,4,0],[-36,2.5,-14],[-36,5.5,14],[-46,7,26],[-46,1,-26],
    [-52,8,0],[-62,6,-14],[-62,9,14]];
  offs.forEach(function(o,i){
    var b=(V2.procB24||KM._buildB24)();
    b.scale.set(i===0?0.85:0.7,i===0?0.85:0.7,i===0?0.85:0.7);
    b.userData={off:new THREE.Vector3(o[0],o[1],o[2]),ph:Math.random()*6.28};
    scene.add(b);planes.push(b);
  });
  var trails=V2.makeContrails(scene,4000);

  var st={
    mode:'overview',t:0.02,theta:0.35,phi:0.85,radius:950,
    target:new THREE.Vector3(-50,40,-80),dragging:false,prev:{x:0,y:0},
    elapsed:0
  };

  /* input */
  canvas.addEventListener('mousedown',function(e){st.dragging=true;st.prev={x:e.clientX,y:e.clientY};});
  window.addEventListener('mouseup',function(){st.dragging=false;});
  canvas.addEventListener('mousemove',function(e){
    if(!st.dragging||st.mode!=='overview')return;
    st.theta-=(e.clientX-st.prev.x)*0.003;
    st.phi=Math.max(0.15,Math.min(1.45,st.phi-(e.clientY-st.prev.y)*0.003));
    st.prev={x:e.clientX,y:e.clientY};
  });
  canvas.addEventListener('wheel',function(e){
    if(st.mode!=='overview')return;
    st.radius=Math.max(150,Math.min(2200,st.radius+e.deltaY*0.5));
    e.preventDefault();
  },{passive:false});

  function tick(dt){
    if(wrap.offsetParent===null)return;  /* tab hidden — skip render */
    st.elapsed+=dt;
    /* advance squadron along route, loop */
    st.t+=dt*0.0065;
    if(st.t>0.97)st.t=0.0;
    var lead=route.curve.getPoint(st.t);
    var tan=route.curve.getTangent(st.t).clone();tan.y=0;tan.normalize();
    var heading=Math.atan2(-tan.x,-tan.z);
    var across=new THREE.Vector3(-tan.z,0,tan.x);
    planes.forEach(function(p,i){
      var o=p.userData.off,ph=p.userData.ph;
      p.position.set(
        lead.x+tan.x*o.x+across.x*o.z+Math.sin(st.elapsed+ph)*1.4,
        lead.y+8+o.y+Math.sin(st.elapsed*1.3+ph)*1.1,
        lead.z+tan.z*o.x+across.z*o.z+Math.cos(st.elapsed*0.9+ph)*1.4);
      p.rotation.set(0,heading+Math.PI/2,0);
      p.traverse(function(c){
        if(c.userData&&c.userData.isProp)c.rotation.y+=dt*21;
        if(c.userData&&c.userData.glbProp)c.rotation[c.userData.spinAxis||'z']+=dt*33;
      });
    });
    /* contrails once above the climb */
    trails.frame++;
    if(st.t>0.25&&trails.frame%2===0){
      planes.forEach(function(p){V2.emitContrail(trails,p,ENGINE_OFFS);});
    }
    /* cameras */
    if(st.mode==='overview'){
      if(!st.dragging)st.theta+=dt*0.05;
      camera.position.set(
        st.target.x+st.radius*Math.sin(st.phi)*Math.cos(st.theta),
        st.target.y+st.radius*Math.cos(st.phi),
        st.target.z+st.radius*Math.sin(st.phi)*Math.sin(st.theta));
      camera.lookAt(st.target);
    }else if(st.mode==='flythrough'){
      var back=Math.max(0,st.t-0.018);
      var cp=route.curve.getPoint(back);
      camera.position.set(
        cp.x-tan.x*52+across.x*64,
        cp.y+36,
        cp.z-tan.z*52+across.z*64);
      camera.lookAt(lead.x-tan.x*20,lead.y+4,lead.z-tan.z*20);
    }else if(st.mode==='crash'){
      /* hover over the crash-site cluster east of Eisenach */
      var fx=GEO.lonToX(9.95),fz=GEO.latToZ(51.0);
      camera.position.set(fx-30,330,fz-190);
      camera.lookAt(fx,0,fz+30);
    }else{ /* topdown */
      camera.position.set(lead.x*0.35-40,1250,lead.z*0.35-40);
      camera.lookAt(-50,0,-80);
    }
    renderer.render(scene,camera);
  }

  window.addEventListener('resize',function(){
    var w2=wrap.clientWidth,h2=wrap.clientHeight;
    if(w2>0&&h2>0){camera.aspect=w2/h2;camera.updateProjectionMatrix();renderer.setSize(w2,h2);}
  });

  V2.route={tick:tick,state:st,renderer:renderer,camera:camera,wrap:wrap,sceneRef:scene};
  console.log('KM v2: route explorer built');
};

/* view buttons in the explorer panel call this */
window.setTerrainView=function(mode,btn){
  if(!V2.route)V2.initRoute();
  if(V2.route){
    V2.route.state.mode=mode;
    V2.setCrashLabels(V2.route.sceneRef,mode==='crash');
  }
  document.querySelectorAll('#sec-route .terrain-btn').forEach(function(b){
    b.classList.remove('active');
  });
  if(btn)btn.classList.add('active');
};

/* ───────────── DOM REPAIR + TAB WIRING ─────────────
   The page ships two panels with id="sec-3d" (the old Flight Path
   Explorer and the newer Battle sim). Rename the first to sec-route,
   give it its own canvas ids, and add a 4th tab. */
V2.fixDom=function(){
  /* the original height rule targets #terrain-canvas by id; the renamed
     route canvas needs its own */
  var st=document.createElement('style');
  st.textContent='#route-canvas{width:100%;height:500px;display:block}'+
    '@media (max-width:767px){#route-canvas{height:min(60vh,400px)}}';
  document.head.appendChild(st);
  var panels=document.querySelectorAll('[id="sec-3d"]');
  if(panels.length>1){
    var old=null;
    panels.forEach(function(p){if(!p.querySelector('#cp-hud')&&!old)old=p;});
    if(old){
      old.id='sec-route';
      var w=old.querySelector('#terrain-wrap');if(w)w.id='route-wrap';
      var c=old.querySelector('#terrain-canvas');if(c)c.id='route-canvas';
      /* add the crash-sites view button */
      var ctr=old.querySelector('.terrain-controls');
      if(ctr&&!ctr.querySelector('[data-crash]')){
        var cb=document.createElement('button');
        cb.className='terrain-btn';
        cb.setAttribute('data-crash','1');
        cb.setAttribute('onclick',"setTerrainView('crash',this)");
        cb.textContent='Crash Sites';
        ctr.appendChild(cb);
      }
    }
  }
  /* tab nav: relabel + insert */
  var tabs=document.querySelectorAll('.kb-nav a');
  var battleTab=null;
  tabs.forEach(function(a){
    var oc=a.getAttribute('onclick')||'';
    if(oc.indexOf("'sec-3d'")>-1)battleTab=a;
  });
  if(battleTab&&document.getElementById('sec-route')&&!document.getElementById('tab-route')){
    battleTab.textContent='Battle Simulator';
    var routeTab=battleTab.cloneNode(false);
    routeTab.id='tab-route';
    routeTab.textContent='Flight Path 3D';
    routeTab.setAttribute('onclick',"switchTab(this,'sec-route')");
    routeTab.classList.remove('act');
    battleTab.parentNode.insertBefore(routeTab,battleTab);
  }
  /* wrap switchTab to lazy-init the route scene */
  if(window.switchTab&&!window._kmV2TabWrapped){
    window._kmV2TabWrapped=true;
    var orig=window.switchTab;
    window.switchTab=function(btn,targetId){
      orig(btn,targetId);
      if(targetId==='sec-route'){
        setTimeout(function(){
          V2.initRoute();
          if(V2.route){
            var w2=V2.route.wrap.clientWidth,h2=V2.route.wrap.clientHeight;
            if(w2>0&&h2>0){
              V2.route.camera.aspect=w2/h2;
              V2.route.camera.updateProjectionMatrix();
              V2.route.renderer.setSize(w2,h2);
            }
          }
        },120);
      }
    };
  }
};

/* ───────────────────── BOOT ───────────────────── */
function whenReady(fn){
  if(document.readyState!=='loading')fn();
  else document.addEventListener('DOMContentLoaded',fn);
}
/* page-layout requests: hide the Flight Path 3D tab, dock the tab bar,
   battle sim above Historical Context */
V2.fixDom2=function(){
  try{
    var navAs=Array.prototype.slice.call(document.querySelectorAll('.kb-nav a'));
    navAs.forEach(function(a2){
      if(/flight\s*path\s*3d/i.test(a2.textContent||''))a2.style.display='none';
    });
    /* the "Click & drag to rotate" help pill goes */
    var allDivs=document.querySelectorAll('div,span,p');
    for(var hd=0;hd<allDivs.length;hd++){
      var tx=allDivs[hd].textContent||'';
      if(/click\s*&\s*drag to rotate/i.test(tx)&&tx.length<60){
        allDivs[hd].style.display='none';
      }
    }
    var nav=document.querySelector('.kb-nav');
    if(nav){
      /* sticky on the nav ITSELF — styling its parent wrapper
         collapsed the section heights */
      nav.style.position='sticky';nav.style.top='0';
      nav.style.zIndex='95';nav.style.background='#0b0c0e';
    }
    /* (section reorder reverted — the DOM walk grabbed the wrong
       container and collapsed the sim; do that move in the Designer) */
  }catch(eL){console.warn('KM v2 layout',eL);}
};
/* ── PIXEL-PERFECT TIMELINE TICKS ──────────────────────────────
   The original embed spaces the scrubber labels EVENLY. The real
   events are not evenly spaced (the wrong turn is deep into the
   mission). Re-anchor every tick to its true fraction of the run,
   measured from the flown route's arc length:
     Tibenham 0 · North Sea .13 · Holland .245 · IP/Wrong Turn .60
     · Göttingen .65 · Battle .81 · Return Home .92                */
V2.TL_FRAC=[
  {re:/TIBENHAM/,           f:0.00, edge:'L'},
  {re:/NORTH\s*SEA/,        f:0.15},
  {re:/HOLLAND/,            f:0.30},
  {re:/NAV|WRONG\s*TURN|^IP/, f:0.56},
  {re:/G[OÖ]TTINGEN/,       f:0.65},
  {re:/^BATTLE$/,           f:0.84},
  {re:/RETURN\s*HOME/,      f:0.92, edge:'R'}
];
V2.fixTimeline=function(){
  try{
    var marksC=document.querySelector('.cp-tl-marks');
    if(!marksC)return false;
    var marks=Array.prototype.slice.call(marksC.querySelectorAll('.cp-tl-mark'));
    if(!marks.length)return false;
    var h=marksC.getBoundingClientRect().height;
    if(getComputedStyle(marksC).position==='static')marksC.style.position='relative';
    if(!marksC.style.minHeight)marksC.style.minHeight=Math.max(28,Math.round(h)+14)+'px';
    marksC.style.overflow='visible';
    /* resolve each mark to its fraction, keep them in time order */
    var items=[];
    marks.forEach(function(m){
      var t=(m.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();
      var hit=null;V2.TL_FRAC.forEach(function(d){if(!hit&&d.re.test(t))hit=d;});
      if(hit)items.push({m:m,f:KMMissionTimeline.seekFraction(KMMissionTimeline.secondsAt(hit.f),KM._playbackEndSeconds||300),edge:hit.edge,t:t});
    });
    if(items.length<5)return false;
    items.sort(function(a,b){return a.f-b.f;});
    var cW=marksC.getBoundingClientRect().width||800;
    var prevRightPct=-99,row=0;
    items.forEach(function(it){
      var m=it.m;
      /* approx label half-width as a % of the track */
      var halfPct=((it.t.length*7.0)/2)/cW*100;
      var leftEdge=it.f*100-halfPct;
      /* if this label would touch the previous one on the same row, drop it a row */
      if(leftEdge<prevRightPct+1){ row=(row+1)%2; } else { row=0; }
      prevRightPct=it.f*100+halfPct;
      m.style.position='absolute';
      m.style.left=(it.f*100).toFixed(2)+'%';
      m.style.bottom=row? '-13px':'1px';
      m.style.whiteSpace='nowrap';
      m.style.transform = it.edge==='L' ? 'translateX(0)' :
                          it.edge==='R' ? 'translateX(-100%)' :
                          'translateX(-50%)';
      /* precise tick that points from the label up to the rail at the
         exact fraction (taller for the lower row so it still reaches) */
      var tick=m.querySelector('.km-tl-tick');
      if(!tick){tick=document.createElement('span');tick.className='km-tl-tick';m.appendChild(tick);}
      tick.style.cssText='position:absolute;'+
        (it.edge==='L'?'left:2px;':it.edge==='R'?'right:2px;':'left:50%;')+
        'top:'+(row?'-18px':'-8px')+';width:1px;height:'+(row?'16px':'6px')+
        ';background:rgba(255,215,94,0.55);'+(it.edge==='C'?'transform:translateX(-50%);':'');
      m.dataset.kmTl='1';
    });
    return true;
  }catch(eT){return false;}
};
V2._timelineWatch=function(){
  var tries=0;
  var iv=setInterval(function(){
    tries++;
    var ok=V2.fixTimeline();
    if(ok||tries>40)clearInterval(iv);
  },400);
  try{
    var host=document.querySelector('.cp-bottom')||document.body;
    var mo=new MutationObserver(function(){
      /* if our ticks lost their absolute positioning, re-pin them */
      var m=document.querySelector('.cp-tl-mark');
      if(m&&!m.dataset.kmTl)V2.fixTimeline();
    });
    mo.observe(host,{childList:true,subtree:true});
  }catch(eM){}
};
whenReady(function(){V2.fixDom();V2.fixDom2();V2._timelineWatch();});

/* Wrap the original master init (defined by embed block 8). */
(function(){
  function wrapInit(){
    if(!window.initCenterpiece||window._kmV2InitWrapped)return false;
    window._kmV2InitWrapped=true;
    var orig=window.initCenterpiece;
    window.initCenterpiece=function(){
      try{orig();}catch(e){console.error('KM v2 init',e);}
      try{V2.postUpgrade();}catch(e){console.error('KM v2 postUpgrade',e);}
      V2.startLoop();
      /* boot watchdog: if a transient WebGL failure killed the build,
         rebuild terrain + restart the loop — never a white canvas */
      var tries=4;
      (function ensure(){
        if(KM._ren&&KM._curve&&KM._animRunning)return;
        if(tries--<=0)return;
        try{
          if(!KM._ren||!KM._curve){KM.terrainInit=false;KM._build3DTerrain();}
          if(KM._ren&&!KM._animRunning)KM._buildAnimation();
          if(KM._ren)V2.postUpgrade();
        }catch(e){console.warn('KM v2 watchdog',e);}
        setTimeout(ensure,1400);
      })();
    };
    window.initTerrain=window.initCenterpiece;
    return true;
  }
  if(!wrapInit()){
    /* embeds not parsed yet (script placed in header) — retry on DOM ready */
    whenReady(wrapInit);
  }
  /* If init already ran before this script loaded, upgrade in place. */
  if(KM.terrainInit&&KM._s){
    console.warn('KM v2: loaded after init — applying live upgrade not supported; reload page.');
  }
})();

/* warm the tile and model caches immediately */
V2.loadDEM().catch(function(){/* Terrain initialization handles the fallback. */});
if(V2.loadModels)V2.loadModels();

console.log('KM v2: engine ready');
})(); /* end IIFE */
