import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  Reader,
  SimpleReader,
  Writer,
  SimpleWriter,
  DataType,
  FileType,
  Request,
  StringTable,
  GTOBuilder,
  polygon,
  transform,
  GTODTO,
  ObjectDTO,
  ComponentDTO,
  PropertyDTO,
  ObjectCollection
} from '../src/index.js';

describe('StringTable', () => {
  test('should intern and lookup strings', () => {
    const table = new StringTable();
    const id1 = table.intern('hello');
    const id2 = table.intern('world');
    const id3 = table.intern('hello'); // duplicate

    assert.strictEqual(id1, 0);
    assert.strictEqual(id2, 1);
    assert.strictEqual(id3, 0); // same as first 'hello'

    assert.strictEqual(table.stringFromId(0), 'hello');
    assert.strictEqual(table.stringFromId(1), 'world');
    assert.strictEqual(table.size, 2);
  });

  test('should clear correctly', () => {
    const table = new StringTable();
    table.intern('test');
    assert.strictEqual(table.size, 1);

    table.clear();
    assert.strictEqual(table.size, 0);
  });
});

describe('Reader', () => {
  test('should parse simple GTO text', () => {
    const content = `GTOa (4)

myObject : testProtocol (1)
{
    myComponent
    {
        float[3][2] position = [ [ 1.0 2.0 3.0 ] [ 4.0 5.0 6.0 ] ]
    }
}
`;

    const reader = new SimpleReader();
    const success = reader.open(content, 'test.gto');

    assert.strictEqual(success, true);
    assert.strictEqual(reader.result.version, 4);
    assert.strictEqual(reader.result.objects.length, 1);

    const obj = reader.result.objects[0];
    assert.strictEqual(obj.name, 'myObject');
    assert.strictEqual(obj.protocol, 'testProtocol');
    assert.strictEqual(obj.protocolVersion, 1);

    const comp = obj.components.myComponent;
    assert.ok(comp);

    const prop = comp.properties.position;
    assert.ok(prop);
    assert.strictEqual(prop.type, 'float');
    assert.strictEqual(prop.width, 3);
    assert.strictEqual(prop.size, 2);
    assert.deepStrictEqual(prop.data, [[1, 2, 3], [4, 5, 6]]);
  });

  test('should parse integer properties', () => {
    const content = `GTOa (4)

mesh : polygon (2)
{
    indices
    {
        int[1][6] vertex = [ 0 1 2 3 4 5 ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    const prop = reader.result.objects[0].components.indices.properties.vertex;
    assert.strictEqual(prop.type, 'int');
    assert.deepStrictEqual(prop.data, [0, 1, 2, 3, 4, 5]);
  });

  test('should parse string properties', () => {
    const content = `GTOa (4)

config : settings (1)
{
    info
    {
        string[1][2] names = [ "Alice" "Bob" ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    const prop = reader.result.objects[0].components.info.properties.names;
    assert.strictEqual(prop.type, 'string');
    assert.deepStrictEqual(prop.data, ['Alice', 'Bob']);
  });

  test('should handle component interpretation', () => {
    const content = `GTOa (4)

obj : proto (1)
{
    transform as matrix
    {
        float[16][1] matrix = [ 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    const comp = reader.result.objects[0].components.transform;
    assert.strictEqual(comp.interpretation, 'matrix');
  });

  test('should handle property interpretation', () => {
    const content = `GTOa (4)

obj : proto (1)
{
    points
    {
        float[3][1] position as coordinate = [ 1.0 2.0 3.0 ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    const prop = reader.result.objects[0].components.points.properties.position;
    assert.strictEqual(prop.interpretation, 'coordinate');
  });

  test('should parse multiple objects', () => {
    const content = `GTOa (4)

object1 : proto (1)
{
    comp
    {
        int[1][1] value = [ 1 ]
    }
}

object2 : proto (1)
{
    comp
    {
        int[1][1] value = [ 2 ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    assert.strictEqual(reader.result.objects.length, 2);
    assert.strictEqual(reader.result.objects[0].name, 'object1');
    assert.strictEqual(reader.result.objects[1].name, 'object2');
  });

  test('should handle comments', () => {
    const content = `GTOa (4)
# This is a comment

obj : proto (1)
{
    # Another comment
    comp
    {
        int[1][1] value = [ 42 ] # inline comment
    }
}
`;

    const reader = new SimpleReader();
    const success = reader.open(content);

    assert.strictEqual(success, true);
    const prop = reader.result.objects[0].components.comp.properties.value;
    assert.deepStrictEqual(prop.data, [42]);
  });

  test('should handle negative numbers', () => {
    const content = `GTOa (4)

obj : proto (1)
{
    comp
    {
        float[3][1] pos = [ -1.5 -2.0 -3.25 ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    const prop = reader.result.objects[0].components.comp.properties.pos;
    assert.deepStrictEqual(prop.data, [[-1.5, -2.0, -3.25]]);
  });

  test('should handle scientific notation', () => {
    const content = `GTOa (4)

obj : proto (1)
{
    comp
    {
        float[1][3] values = [ 1e10 2.5e-3 -1.0E+5 ]
    }
}
`;

    const reader = new SimpleReader();
    reader.open(content);

    const prop = reader.result.objects[0].components.comp.properties.values;
    assert.deepStrictEqual(prop.data, [1e10, 2.5e-3, -1.0e5]);
  });

  test('custom reader with selective reading', () => {
    class SelectiveReader extends Reader {
      constructor() {
        super();
        this.readObjects = [];
        this.skippedObjects = [];
      }

      object(name, protocol, protocolVersion, info) {
        if (name === 'wanted') {
          this.readObjects.push(name);
          return Request.Read;
        }
        this.skippedObjects.push(name);
        return Request.Skip;
      }

      component(name, info) {
        return Request.Read;
      }

      property(name, interpretation, info) {
        return Request.Read;
      }

      dataRead(info, data) {
        this.lastData = data;
      }
    }

    const content = `GTOa (4)

unwanted : proto (1)
{
    comp
    {
        int[1][1] value = [ 1 ]
    }
}

wanted : proto (1)
{
    comp
    {
        int[1][1] value = [ 42 ]
    }
}
`;

    const reader = new SelectiveReader();
    reader.open(content);

    assert.deepStrictEqual(reader.readObjects, ['wanted']);
    assert.deepStrictEqual(reader.skippedObjects, ['unwanted']);
    assert.deepStrictEqual(reader.lastData, [42]);
  });
});

describe('Writer', () => {
  test('should write simple GTO text', () => {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

    writer.beginObject('cube', 'polygon', 2);
    writer.beginComponent('points');
    writer.property('position', DataType.Float, 2, 3);
    writer.endComponent();
    writer.endObject();

    writer.beginData();
    writer.propertyData([1.0, 2.0, 3.0, 4.0, 5.0, 6.0]);
    writer.endData();

    const output = writer.close();

    assert.ok(output.includes('GTOa (4)'));
    assert.ok(output.includes('cube : polygon (2)'));
    assert.ok(output.includes('points'));
    assert.ok(output.includes('float[3] position')); // width=3, size inferred from data
  });

  test('should write integer data', () => {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

    writer.beginObject('mesh', 'polygon', 1);
    writer.beginComponent('indices');
    writer.property('vertex', DataType.Int, 6, 1);
    writer.endComponent();
    writer.endObject();

    writer.beginData();
    writer.propertyData([0, 1, 2, 3, 4, 5]);
    writer.endData();

    const output = writer.close();

    assert.ok(output.includes('int vertex')); // width=1, no brackets needed
    assert.ok(output.includes('[ 0 1 2 3 4 5 ]'));
  });

  test('should write string data', () => {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

    writer.beginObject('config', 'settings', 1);
    writer.beginComponent('info');
    writer.property('names', DataType.String, 2, 1);
    writer.endComponent();
    writer.endObject();

    writer.beginData();
    writer.propertyData([writer.intern('Alice'), writer.intern('Bob')]);
    writer.endData();

    const output = writer.close();

    assert.ok(output.includes('string names')); // width=1, no brackets
    assert.ok(output.includes('"Alice"'));
    assert.ok(output.includes('"Bob"'));
  });

  test('should handle property interpretation', () => {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

    writer.beginObject('obj', 'proto', 1);
    writer.beginComponent('points');
    writer.property('position', DataType.Float, 1, 3, 'coordinate');
    writer.endComponent();
    writer.endObject();

    writer.beginData();
    writer.propertyData([1.0, 2.0, 3.0]);
    writer.endData();

    const output = writer.close();

    assert.ok(output.includes('position as coordinate'));
  });

  test('should handle component interpretation', () => {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

    writer.beginObject('obj', 'proto', 1);
    writer.beginComponent('transform', 'matrix');
    writer.property('values', DataType.Float, 16, 1);
    writer.endComponent();
    writer.endObject();

    writer.beginData();
    writer.propertyData(new Array(16).fill(0));
    writer.endData();

    const output = writer.close();

    assert.ok(output.includes('transform as matrix'));
  });

  test('should escape strings properly', () => {
    const writer = new Writer();
    writer.open(FileType.TextGTO);

    writer.beginObject('obj', 'proto', 1);
    writer.beginComponent('comp');
    writer.property('text', DataType.String, 1, 1);
    writer.endComponent();
    writer.endObject();

    writer.beginData();
    writer.propertyData([writer.intern('hello\nworld\t"test"')]);
    writer.endData();

    const output = writer.close();

    assert.ok(output.includes('\\n'));
    assert.ok(output.includes('\\t'));
    assert.ok(output.includes('\\"'));
  });
});

describe('SimpleWriter', () => {
  test('should write structured data', () => {
    const data = {
      objects: [{
        name: 'cube',
        protocol: 'polygon',
        protocolVersion: 2,
        components: {
          points: {
            properties: {
              position: {
                type: 'float',
                size: 2,
                width: 3,
                data: [[1, 2, 3], [4, 5, 6]]
              }
            }
          }
        }
      }]
    };

    const output = SimpleWriter.write(data);

    assert.ok(output.includes('GTOa (4)'));
    assert.ok(output.includes('cube : polygon (2)'));
    assert.ok(output.includes('float[3] position')); // width=3, size inferred
  });
});

describe('Round-trip', () => {
  test('should read what was written', () => {
    // Create a complex structure
    const original = {
      objects: [{
        name: 'testObject',
        protocol: 'testProto',
        protocolVersion: 3,
        components: {
          positions: {
            properties: {
              pos: {
                type: 'float',
                size: 3,
                width: 3,
                data: [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
              }
            }
          },
          metadata: {
            properties: {
              count: {
                type: 'int',
                size: 1,
                width: 1,
                data: [42]
              }
            }
          }
        }
      }]
    };

    // Write to text
    const text = SimpleWriter.write(original);

    // Read it back
    const reader = new SimpleReader();
    reader.open(text);

    // Verify
    const result = reader.result;
    assert.strictEqual(result.objects.length, 1);

    const obj = result.objects[0];
    assert.strictEqual(obj.name, 'testObject');
    assert.strictEqual(obj.protocol, 'testProto');
    assert.strictEqual(obj.protocolVersion, 3);

    const posData = obj.components.positions.properties.pos.data;
    assert.deepStrictEqual(posData, [[1, 2, 3], [4, 5, 6], [7, 8, 9]]);

    const countData = obj.components.metadata.properties.count.data;
    assert.deepStrictEqual(countData, [42]);
  });
});

describe('GTOBuilder', () => {
  test('should build simple structure', () => {
    const data = new GTOBuilder()
      .object('myObject', 'testProto', 1)
        .component('settings')
          .int('count', 42)
          .float('scale', 1.5)
          .string('name', 'test')
        .end()
      .end()
      .build();

    assert.strictEqual(data.version, 4);
    assert.strictEqual(data.objects.length, 1);
    assert.strictEqual(data.objects[0].name, 'myObject');
    assert.strictEqual(data.objects[0].protocol, 'testProto');

    const props = data.objects[0].components.settings.properties;
    assert.deepStrictEqual(props.count.data, [42]);
    assert.deepStrictEqual(props.scale.data, [1.5]);
    assert.deepStrictEqual(props.name.data, ['test']);
  });

  test('should build with vector properties', () => {
    const data = new GTOBuilder()
      .object('vectors', 'test', 1)
        .component('data')
          .float2('uv', [[0, 0], [1, 0], [1, 1], [0, 1]])
          .float3('position', [[0, 0, 0], [1, 0, 0], [1, 1, 0]])
          .float4('color', [[1, 0, 0, 1], [0, 1, 0, 1]])
        .end()
      .end()
      .build();

    const props = data.objects[0].components.data.properties;
    assert.strictEqual(props.uv.width, 2);
    assert.strictEqual(props.uv.size, 4);
    assert.strictEqual(props.position.width, 3);
    assert.strictEqual(props.position.size, 3);
    assert.strictEqual(props.color.width, 4);
    assert.strictEqual(props.color.size, 2);
  });

  test('should build with flat array conversion', () => {
    const data = new GTOBuilder()
      .object('flat', 'test', 1)
        .component('data')
          .float3('position', [0, 0, 0, 1, 1, 1, 2, 2, 2])
        .end()
      .end()
      .build();

    const pos = data.objects[0].components.data.properties.position;
    assert.strictEqual(pos.size, 3);
    assert.deepStrictEqual(pos.data, [[0, 0, 0], [1, 1, 1], [2, 2, 2]]);
  });

  test('should build multiple objects', () => {
    const data = new GTOBuilder()
      .object('obj1', 'proto', 1)
        .component('comp')
          .int('value', 1)
        .end()
      .end()
      .object('obj2', 'proto', 1)
        .component('comp')
          .int('value', 2)
        .end()
      .end()
      .build();

    assert.strictEqual(data.objects.length, 2);
    assert.strictEqual(data.objects[0].name, 'obj1');
    assert.strictEqual(data.objects[1].name, 'obj2');
  });

  test('should build with matrix property', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const data = new GTOBuilder()
      .object('transform', 'test', 1)
        .component('matrix')
          .matrix4('globalMatrix', [identity])
        .end()
      .end()
      .build();

    const mat = data.objects[0].components.matrix.properties.globalMatrix;
    assert.strictEqual(mat.width, 16);
    assert.strictEqual(mat.size, 1);
  });

  test('should convert to JSON', () => {
    const json = new GTOBuilder()
      .object('test', 'proto', 1)
        .component('comp')
          .int('value', 42)
        .end()
      .end()
      .toJSON();

    const parsed = JSON.parse(json);
    assert.strictEqual(parsed.objects[0].name, 'test');
  });

  test('builder output should be readable by SimpleReader', () => {
    const data = new GTOBuilder()
      .object('mesh', 'polygon', 2)
        .component('points')
          .float3('position', [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]])
        .end()
        .component('indices')
          .int('vertex', [0, 1, 2, 2, 3, 0])
        .end()
      .end()
      .build();

    // Write to RV format
    const rv = SimpleWriter.write(data);

    // Read back
    const reader = new SimpleReader();
    reader.open(rv);

    assert.strictEqual(reader.result.objects[0].name, 'mesh');
    assert.strictEqual(reader.result.objects[0].components.points.properties.position.size, 4);
  });
});

describe('Polygon Builder', () => {
  test('should build polygon mesh', () => {
    const data = polygon('cube')
      .positions([
        [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
        [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
      ])
      .normals([
        [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
        [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]
      ])
      .indices([0, 1, 2, 3, 4, 5, 6, 7])
      .build();

    assert.strictEqual(data.objects[0].name, 'cube');
    assert.strictEqual(data.objects[0].protocol, 'polygon');
    assert.ok(data.objects[0].components.points);
    assert.ok(data.objects[0].components.indices);
  });
});

describe('Transform Builder', () => {
  test('should build transform', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const data = transform('myTransform')
      .matrix([identity])
      .parent('root')
      .build();

    assert.strictEqual(data.objects[0].name, 'myTransform');
    assert.strictEqual(data.objects[0].protocol, 'transform');
    assert.ok(data.objects[0].components.object.properties.globalMatrix);
    assert.deepStrictEqual(data.objects[0].components.object.properties.parent.data, ['root']);
  });
});

describe('GTODTO', () => {
  // Sample data for testing
  const sampleData = {
    version: 4,
    objects: [
      {
        name: 'rv',
        protocol: 'RVSession',
        protocolVersion: 1,
        components: {
          session: {
            interpretation: '',
            properties: {
              fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [24] },
              currentFrame: { type: 'int', size: 1, width: 1, interpretation: '', data: [100] },
              range: { type: 'int', size: 2, width: 1, interpretation: '', data: [1, 500] }
            }
          }
        }
      },
      {
        name: 'source1',
        protocol: 'RVFileSource',
        protocolVersion: 1,
        components: {
          media: {
            interpretation: '',
            properties: {
              movie: { type: 'string', size: 1, width: 1, interpretation: '', data: ['/path/to/movie1.mov'] }
            }
          }
        }
      },
      {
        name: 'source2',
        protocol: 'RVFileSource',
        protocolVersion: 1,
        components: {
          media: {
            interpretation: '',
            properties: {
              movie: { type: 'string', size: 1, width: 1, interpretation: '', data: ['/path/to/movie2.mov'] }
            }
          }
        }
      },
      {
        name: 'paint1',
        protocol: 'RVPaint',
        protocolVersion: 1,
        components: {
          'pen:1:50:User': {
            interpretation: '',
            properties: {
              color: { type: 'float', size: 4, width: 1, interpretation: '', data: [1, 0, 0, 1] },
              points: { type: 'float', size: 3, width: 2, interpretation: '', data: [[10, 20], [30, 40], [50, 60]] }
            }
          }
        }
      }
    ]
  };

  test('should create DTO from parsed data', () => {
    const dto = new GTODTO(sampleData);

    assert.strictEqual(dto.version, 4);
    assert.strictEqual(dto.objectCount, 4);
  });

  test('should get object by name', () => {
    const dto = new GTODTO(sampleData);
    const rv = dto.object('rv');

    assert.strictEqual(rv.name, 'rv');
    assert.strictEqual(rv.protocol, 'RVSession');
    assert.strictEqual(rv.protocolVersion, 1);
    assert.ok(rv.exists());
  });

  test('should return null object for non-existent name', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('nonexistent');

    assert.strictEqual(missing.exists(), false);
    assert.strictEqual(missing.name, '');
  });

  test('should filter by protocol', () => {
    const dto = new GTODTO(sampleData);
    const sources = dto.byProtocol('RVFileSource');

    assert.strictEqual(sources.length, 2);
    assert.strictEqual(sources.first().name, 'source1');
    assert.strictEqual(sources.last().name, 'source2');
  });

  test('should filter by name pattern', () => {
    const dto = new GTODTO(sampleData);
    const sources = dto.byName(/^source/);

    assert.strictEqual(sources.length, 2);
  });

  test('should get protocols list', () => {
    const dto = new GTODTO(sampleData);
    const protocols = dto.protocols();

    assert.ok(protocols.includes('RVSession'));
    assert.ok(protocols.includes('RVFileSource'));
    assert.ok(protocols.includes('RVPaint'));
  });

  test('should get component from object', () => {
    const dto = new GTODTO(sampleData);
    const session = dto.object('rv').component('session');

    assert.strictEqual(session.name, 'session');
    assert.ok(session.exists());
  });

  test('should return null component for non-existent name', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('rv').component('nonexistent');

    assert.strictEqual(missing.exists(), false);
  });

  test('should get property from component', () => {
    const dto = new GTODTO(sampleData);
    const fps = dto.object('rv').component('session').property('fps');

    assert.strictEqual(fps.name, 'fps');
    assert.strictEqual(fps.type, 'float');
    assert.strictEqual(fps.value(), 24);
    assert.ok(fps.exists());
  });

  test('should return null property for non-existent name', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('rv').component('session').property('nonexistent');

    assert.strictEqual(missing.exists(), false);
    assert.strictEqual(missing.value(), null);
  });

  test('property value() should unwrap single values', () => {
    const dto = new GTODTO(sampleData);

    // Single value
    const fps = dto.object('rv').component('session').property('fps').value();
    assert.strictEqual(fps, 24);

    // Array value
    const range = dto.object('rv').component('session').property('range').value();
    assert.deepStrictEqual(range, [1, 500]);
  });

  test('property at() should get specific index', () => {
    const dto = new GTODTO(sampleData);
    const range = dto.object('rv').component('session').property('range');

    assert.strictEqual(range.at(0), 1);
    assert.strictEqual(range.at(1), 500);
    assert.strictEqual(range.at(999), null);
  });

  test('property valueOr() should return default for missing', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('rv').component('session').property('nonexistent');

    assert.strictEqual(missing.valueOr(42), 42);
  });

  test('shorthand prop() method should work', () => {
    const dto = new GTODTO(sampleData);

    // Component.prop()
    const fps = dto.object('rv').component('session').prop('fps');
    assert.strictEqual(fps, 24);

    // Object.prop(component, property)
    const currentFrame = dto.object('rv').prop('session', 'currentFrame');
    assert.strictEqual(currentFrame, 100);
  });

  test('ObjectCollection map should work', () => {
    const dto = new GTODTO(sampleData);
    const moviePaths = dto.byProtocol('RVFileSource')
      .map(s => s.component('media').property('movie').value());

    assert.deepStrictEqual(moviePaths, ['/path/to/movie1.mov', '/path/to/movie2.mov']);
  });

  test('ObjectCollection filter should work', () => {
    const dto = new GTODTO(sampleData);
    const filtered = dto.objects().filter(o => o.name.startsWith('source'));

    assert.strictEqual(filtered.length, 2);
  });

  test('ObjectCollection find should work', () => {
    const dto = new GTODTO(sampleData);
    const found = dto.objects().find(o => o.name === 'source2');

    assert.strictEqual(found.name, 'source2');
  });

  test('ObjectCollection groupByProtocol should work', () => {
    const dto = new GTODTO(sampleData);
    const groups = dto.groupByProtocol();

    assert.ok(groups.has('RVSession'));
    assert.ok(groups.has('RVFileSource'));
    assert.strictEqual(groups.get('RVFileSource').length, 2);
  });

  test('ObjectCollection should be iterable', () => {
    const dto = new GTODTO(sampleData);
    const names = [];
    for (const obj of dto.objects()) {
      names.push(obj.name);
    }

    assert.strictEqual(names.length, 4);
    assert.ok(names.includes('rv'));
  });

  test('component propertyNames should return all names', () => {
    const dto = new GTODTO(sampleData);
    const names = dto.object('rv').component('session').propertyNames();

    assert.ok(names.includes('fps'));
    assert.ok(names.includes('currentFrame'));
    assert.ok(names.includes('range'));
  });

  test('component properties should return PropertyDTO array', () => {
    const dto = new GTODTO(sampleData);
    const props = dto.object('rv').component('session').properties();

    assert.strictEqual(props.length, 3);
    assert.ok(props.every(p => p instanceof PropertyDTO));
  });

  test('object componentNames should return all names', () => {
    const dto = new GTODTO(sampleData);
    const names = dto.object('rv').componentNames();

    assert.deepStrictEqual(names, ['session']);
  });

  test('object components should return ComponentDTO array', () => {
    const dto = new GTODTO(sampleData);
    const comps = dto.object('rv').components();

    assert.strictEqual(comps.length, 1);
    assert.ok(comps.every(c => c instanceof ComponentDTO));
  });

  test('object componentsByPattern should filter by regex', () => {
    const dto = new GTODTO(sampleData);
    const penComps = dto.object('paint1').componentsByPattern(/^pen:/);

    assert.strictEqual(penComps.length, 1);
    assert.strictEqual(penComps[0].name, 'pen:1:50:User');
  });

  test('safe chaining should not throw', () => {
    const dto = new GTODTO(sampleData);

    // Deep non-existent path should return null, not throw
    const value = dto
      .object('nonexistent')
      .component('also-missing')
      .property('nope')
      .value();

    assert.strictEqual(value, null);
  });

  test('property flat() should flatten nested arrays', () => {
    const dto = new GTODTO(sampleData);
    const points = dto.object('paint1').component('pen:1:50:User').property('points');

    const flat = points.flat();
    assert.deepStrictEqual(flat, [10, 20, 30, 40, 50, 60]);
  });

  test('property map and filter should work', () => {
    const dto = new GTODTO(sampleData);
    const points = dto.object('paint1').component('pen:1:50:User').property('points');

    const mapped = points.map(p => p[0]);
    assert.deepStrictEqual(mapped, [10, 30, 50]);

    const filtered = points.filter(p => p[0] > 20);
    assert.deepStrictEqual(filtered, [[30, 40], [50, 60]]);
  });

  test('toObject methods should work', () => {
    const dto = new GTODTO(sampleData);

    const objData = dto.object('rv').toObject();
    assert.strictEqual(objData.name, 'rv');

    const compData = dto.object('rv').component('session').toObject();
    assert.strictEqual(compData.name, 'session');

    const propData = dto.object('rv').component('session').property('fps').toObject();
    assert.strictEqual(propData.type, 'float');
  });

  test('toJSON should serialize correctly', () => {
    const dto = new GTODTO(sampleData);
    const json = dto.toJSON();
    const parsed = JSON.parse(json);

    assert.strictEqual(parsed.version, 4);
    assert.strictEqual(parsed.objects.length, 4);
  });
});

describe('GTODTO RV Helpers', () => {
  const rvSessionData = {
    version: 4,
    objects: [
      {
        name: 'rv',
        protocol: 'RVSession',
        protocolVersion: 1,
        components: {
          session: {
            interpretation: '',
            properties: {
              fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [30] },
              currentFrame: { type: 'int', size: 1, width: 1, interpretation: '', data: [50] },
              range: { type: 'int', size: 2, width: 1, interpretation: '', data: [1, 200] },
              region: { type: 'int', size: 2, width: 1, interpretation: '', data: [25, 175] },
              marks: { type: 'int', size: 3, width: 1, interpretation: '', data: [50, 100, 150] }
            }
          }
        }
      },
      {
        name: 'sourceGroup000',
        protocol: 'RVSourceGroup',
        protocolVersion: 1,
        components: {}
      },
      {
        name: 'sourceGroup000_source',
        protocol: 'RVFileSource',
        protocolVersion: 1,
        components: {
          media: {
            interpretation: '',
            properties: {
              movie: { type: 'string', size: 1, width: 1, interpretation: '', data: ['/renders/shot_001.exr'] }
            }
          }
        }
      },
      {
        name: 'connections',
        protocol: 'connection',
        protocolVersion: 1,
        components: {
          evaluation: {
            interpretation: '',
            properties: {
              connections: { type: 'string', size: 2, width: 2, interpretation: '', data: [['node1', 'node2'], ['node2', 'node3']] }
            }
          }
        }
      }
    ]
  };

  test('session() should return RVSession object', () => {
    const dto = new GTODTO(rvSessionData);
    const session = dto.session();

    assert.strictEqual(session.protocol, 'RVSession');
    assert.strictEqual(session.name, 'rv');
  });

  test('timeline() should return timeline info', () => {
    const dto = new GTODTO(rvSessionData);
    const timeline = dto.timeline();

    assert.strictEqual(timeline.fps, 30);
    assert.strictEqual(timeline.currentFrame, 50);
    assert.deepStrictEqual(timeline.range, [1, 200]);
    assert.deepStrictEqual(timeline.region, [25, 175]);
    assert.deepStrictEqual(timeline.marks, [50, 100, 150]);
  });

  test('fileSources() should return file sources', () => {
    const dto = new GTODTO(rvSessionData);
    const sources = dto.fileSources();

    assert.strictEqual(sources.length, 1);
    assert.strictEqual(sources.first().protocol, 'RVFileSource');
  });

  test('sourceGroups() should return source groups', () => {
    const dto = new GTODTO(rvSessionData);
    const groups = dto.sourceGroups();

    assert.strictEqual(groups.length, 1);
    assert.strictEqual(groups.first().protocol, 'RVSourceGroup');
  });

  test('mediaPaths() should extract media paths', () => {
    const dto = new GTODTO(rvSessionData);
    const paths = dto.mediaPaths();

    assert.deepStrictEqual(paths, ['/renders/shot_001.exr']);
  });

  test('connections() should return connection object', () => {
    const dto = new GTODTO(rvSessionData);
    const conn = dto.connections();

    assert.strictEqual(conn.protocol, 'connection');
  });

  test('connectionEdges() should return edge pairs', () => {
    const dto = new GTODTO(rvSessionData);
    const edges = dto.connectionEdges();

    assert.deepStrictEqual(edges, [['node1', 'node2'], ['node2', 'node3']]);
  });
});

describe('GTODTO with Builder Integration', () => {
  test('should work with GTOBuilder output', () => {
    const data = new GTOBuilder()
      .object('myMesh', 'polygon', 2)
        .component('points')
          .float3('position', [[0, 0, 0], [1, 0, 0], [1, 1, 0]])
          .float3('normal', [[0, 0, 1], [0, 0, 1], [0, 0, 1]])
        .end()
        .component('indices')
          .int('vertex', [0, 1, 2])
        .end()
      .end()
      .build();

    const dto = new GTODTO(data);

    assert.strictEqual(dto.objectCount, 1);
    assert.strictEqual(dto.object('myMesh').protocol, 'polygon');

    const positions = dto.object('myMesh').component('points').property('position');
    assert.strictEqual(positions.size, 3);
    assert.deepStrictEqual(positions.at(0), [0, 0, 0]);

    const indices = dto.object('myMesh').prop('indices', 'vertex');
    assert.deepStrictEqual(indices, [0, 1, 2]);
  });

  test('should work with round-trip data', () => {
    // Build -> Write -> Read -> DTO
    const original = new GTOBuilder()
      .object('config', 'settings', 1)
        .component('user')
          .string('name', 'TestUser')
          .int('level', 42)
        .end()
      .end()
      .build();

    const rv = SimpleWriter.write(original);

    const reader = new SimpleReader();
    reader.open(rv);

    const dto = new GTODTO(reader.result);

    assert.strictEqual(dto.object('config').prop('user', 'name'), 'TestUser');
    assert.strictEqual(dto.object('config').prop('user', 'level'), 42);
  });
});
