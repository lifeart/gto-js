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
  transform
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
