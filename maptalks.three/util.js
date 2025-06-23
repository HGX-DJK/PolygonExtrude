// eslint-disable-next-line no-unused-vars
function flatCoordinates(geojson, scale) {
    if (!window.computedbbox || typeof window.computedbbox !== 'function') {
        throw new Error("window.bbox 未正确加载或不是函数");
    };
    const [minx, miny, maxx, maxy] = window.computedbbox(geojson);
    const centerX = (minx + maxx) / 2, centerY = (miny + maxy) / 2;
    const dx = maxx - minx, dy = maxy - miny;
    const max = Math.max(dx, dy);
    geojson.features.forEach(feature => {
        const { coordinates, type } = feature.geometry;
        scale = scale || 160 / max;
        if (['MultiLineString', 'Polygon'].includes(type)) {
            coordinates.forEach(coord => {
                coord.forEach(c => {
                    c[0] -= centerX;
                    c[1] -= centerY;
                    c[0] *= scale;
                    c[1] *= scale;
                });
            });

        }
        if (type === 'MultiPolygon') {
            coordinates.forEach(coords => {
                coords.forEach(coord => {
                    coord.forEach(c => {
                        c[0] -= centerX;
                        c[1] -= centerY;
                        c[0] *= scale;
                        c[1] *= scale;
                    });
                });
            });
        }
        if (type === 'LineString') {
            coordinates.forEach(c => {
                c[0] -= centerX;
                c[1] -= centerY;
                c[0] *= scale;
                c[1] *= scale;
            });
        }
    });

}

// eslint-disable-next-line no-unused-vars
function getGeoJSON(url) {
    return fetch(url).then(res => res.json());
}
function computeFlatBbox(positions) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    }
    return [minX, minY, maxX, maxY];
}
function generateUVs(positions, bbox) {
    const [minX, minY, maxX, maxY] = bbox;
    const width = maxX - minX;
    const height = maxY - minY;

    const uvs = new Float32Array(positions.length / 3 * 2);

    for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
        const x = positions[i];
        const y = positions[i + 1];
        uvs[j] = (x - minX) / width;
        uvs[j + 1] = (y - minY) / height;
    }

    return uvs;
}

function createBufferGeometry(result) {
    const { position, indices, normal } = result;
    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute('position', new THREE.BufferAttribute(position, 3));
    if (normal) {
        geometry.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    }
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    // 👉 添加 uv 坐标
    const bbox = computeFlatBbox(position);
    const uv = generateUVs(position, bbox);
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

    // 原有着色逻辑
    const topColor = new THREE.Color('#fff'), bottomColor = new THREE.Color('#2d2f61');
    const len = position.length;
    const colors = new Float32Array(len);
    for (let j = 0; j < len; j += 3) {
        const z = position[j + 2];
        if (z > 0) {
            colors[j] = topColor.r;
            colors[j + 1] = topColor.g;
            colors[j + 2] = topColor.b;
        } else {
            colors[j] = bottomColor.r;
            colors[j + 1] = bottomColor.g;
            colors[j + 2] = bottomColor.b;
        }
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    return geometry;
}

// eslint-disable-next-line no-unused-vars
function createScene(options = {}) {
    options = Object.assign({}, { lightIntensity: 0.75 }, options);
    const THREE = window.THREE;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xb0b0b0);
    //

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 1, 100000);
    camera.position.set(0, 0, 200);

    //

    const directionalLight = new THREE.DirectionalLight('#fff', 0.3);
    directionalLight.position.set(0.75, -1.75, 100.0).normalize();
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight('#fff', options.lightIntensity);
    scene.add(ambientLight);

    // const pointLight = new THREE.PointLight('#fff', 0.2);
    // scene.add(pointLight);

    //

    const helper = new THREE.GridHelper(200, 10);
    helper.rotation.x = Math.PI / 2;
    scene.add(helper);

    const axisHelper = new THREE.AxesHelper(100);
    // const axisHelper = THREE.AxisHelper(1000);
    scene.add(axisHelper);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    //
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.minDistance = 10;
    controls.maxDistance = 1000;

    function animation() {
        requestAnimationFrame(animation);

        renderer.render(scene, camera);
    }
    animation();
    return scene;

}

// eslint-disable-next-line no-unused-vars
function createCanvas() {
    return document.createElement('canvas');
}

// let dataCanvas = createCanvas();
// let tempCanvas = createCanvas();

// eslint-disable-next-line no-unused-vars
function clearCanvas(ctx) {
    const { width, height } = ctx.canvas;
    ctx.clearRect(-1, 1, width + 1, height + 1);
}

// eslint-disable-next-line no-unused-vars
function rgb2Height(R, G, B) {
    return -10000 + ((R * 256 * 256 + G * 256 + B) * 0.1);
}

// eslint-disable-next-line no-unused-vars
function updateCanvasSize(canvas, width, height) {
    canvas.width = width;
    canvas.height = height;
    Object.assign(canvas.style, { width: `${width}px`, height: `${height}px` });
}

const errorZ = -1;

function scaleHeight(height) {
    return height / 500;
}

// eslint-disable-next-line no-unused-vars
function createTerrain(imageData) {
    const { width, height } = imageData;
    const planeWidth = 100;
    const planeHeight = planeWidth * height / width;
    const THREE = window.THREE;
    const result = window.polyextrude.plane(planeWidth, planeHeight, width - 1, height - 1);
    // const { position, uv, normal, indexs } = result;
    const geometry = createBufferGeometry(result);
    const heights = new Float32Array(geometry.attributes.position.array.length / 3);
    let idx = 0;
    let maxHeight = -Infinity;
    let minHeight = Infinity;
    const imgdata = imageData.data;
    for (let i = 0, len = imgdata.length; i < len; i += 4) {
        const R = imgdata[i], G = imgdata[i + 1], B = imgdata[i + 2], A = imgdata[i + 3];
        let height = 0;
        let z = errorZ;
        // 裙边
        const hasData = A > 200;
        if (hasData) {
            height = rgb2Height(R, G, B);
            z = scaleHeight(height);
        }
        if (height > 8848) {
            height = 0;
            z = errorZ;
        }

        maxHeight = Math.max(maxHeight, height);
        minHeight = Math.min(minHeight, height);
        geometry.attributes.position.array[idx * 3 + 2] = z;
        heights[idx] = height;
        idx++;
    }

    geometry.setAttribute('height', new THREE.BufferAttribute(heights, 1, true));

    const filterIndex = [];
    const index = geometry.getIndex().array;
    const positionarray = geometry.attributes.position.array;
    const errorPotions = [];
    let pIndex = -1, errorIndex = -1;
    for (let i = 0, len = index.length; i < len; i += 3) {
        const a = index[i];
        const b = index[i + 1];
        const c = index[i + 2];
        const indexa = a * 3 + 2;
        const indexb = b * 3 + 2;
        const indexc = c * 3 + 2;
        const z1 = positionarray[indexa];
        const z2 = positionarray[indexb];
        const z3 = positionarray[indexc];
        if (z1 !== errorZ || z2 !== errorZ || z3 !== errorZ) {
            // filterIndex.push(a, b, c);
            filterIndex[++pIndex] = a;
            filterIndex[++pIndex] = b;
            filterIndex[++pIndex] = c;
            if (z1 === errorZ) {
                errorPotions[++errorIndex] = indexa;
            }
            if (z2 === errorZ) {
                errorPotions[++errorIndex] = indexb;
            }
            if (z3 === errorZ) {
                errorPotions[++errorIndex] = indexc;
            }
        }
    }
    for (let i = 0, len = errorPotions.length; i < len; i++) {
        const idx = errorPotions[i];
        positionarray[idx] = 0;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.setIndex(new THREE.Uint32BufferAttribute(filterIndex, 1));
    geometry.needsUpdate = true;
    return {
        minHeight,
        maxHeight,
        geometry
    };

}

let colorci;
// eslint-disable-next-line no-unused-vars
function colorsTerrain(colorsArray, geometry) {

    if (colorci) {
        for (const key in colorci) {
            delete colorci[key];
        }
    }
    colorci = new window.colorin.ColorIn(colorsArray);

    // 根据不同的高度进行着色
    const heights = geometry.attributes.height.array;
    const colors = geometry.attributes.color.array;
    for (let i = 0, len = heights.length; i < len; i++) {
        const height = heights[i];
        const [r, g, b] = colorci.getColor(height);
        const idx = i * 3;
        colors[idx] = r / 255;
        colors[idx + 1] = g / 255;
        colors[idx + 2] = b / 255;
    }
    geometry.attributes.color.needsUpdate = true;
}


 function bbox(geojson) {
    let b = [
      Number.POSITIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    ];
    switch (geojson.type) {
      case "FeatureCollection":
        for (let i = 0; i < geojson.features.length; i++) {
          feature(geojson.features[i], b);
        }
        break;
      case "Feature":
        feature(geojson, b);
        break;
      default:
        geometry(geojson, b);
        break;
    }
    return b;
  }

  function feature(f, b) {
    geometry(f.geometry, b);
  }

  function geometry(g, b) {
    if (!g) {
      return;
    }
    switch (g.type) {
      case "Point":
        point(g.coordinates, b);
        break;
      case "MultiPoint":
        line(g.coordinates, b);
        break;
      case "LineString":
        line(g.coordinates, b);
        break;
      case "MultiLineString":
        polygon(g.coordinates, b);
        break;
      case "Polygon":
        polygon(g.coordinates, b);
        break;
      case "MultiPolygon":
        multipolygon(g.coordinates, b);
        break;
      case "GeometryCollection":
        for (let i = 0; i < g.geometries.length; i++) {
          geometry(g.geometries[i], b);
        }
        break;
    }
  }

  function point(p, b) {
    b[0] = Math.min(b[0], p[0]);
    b[1] = Math.min(b[1], p[1]);
    b[2] = Math.max(b[2], p[0]);
    b[3] = Math.max(b[3], p[1]);
  }

  function line(l, b) {
    for (let i = 0; i < l.length; i++) {
      point(l[i], b);
    }
  }

  function polygon(p, b) {
    for (let i = 0; i < p.length; i++) {
      line(p[i], b);
    }
  }

  function multipolygon(mp, b) {
    for (let i = 0; i < mp.length; i++) {
      polygon(mp[i], b);
    }
  }