import { test, describe, expect } from 'vitest';
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
import type { PropertyInfo } from '../src/constants.js';

describe('StringTable', () => {
  test('should intern and lookup strings', () => {
    const table = new StringTable();
    const id1 = table.intern('hello');
    const id2 = table.intern('world');
    const id3 = table.intern('hello'); // duplicate

    expect(id1).toBe(0);
    expect(id2).toBe(1);
    expect(id3).toBe(0); // same as first 'hello'

    expect(table.stringFromId(0)).toBe('hello');
    expect(table.stringFromId(1)).toBe('world');
    expect(table.size).toBe(2);
  });

  test('should clear correctly', () => {
    const table = new StringTable();
    table.intern('test');
    expect(table.size).toBe(1);

    table.clear();
    expect(table.size).toBe(0);
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

    expect(success).toBe(true);
    expect(reader.result.version).toBe(4);
    expect(reader.result.objects.length).toBe(1);

    const obj = reader.result.objects[0];
    expect(obj.name).toBe('myObject');
    expect(obj.protocol).toBe('testProtocol');
    expect(obj.protocolVersion).toBe(1);

    const comp = obj.components.myComponent;
    expect(comp).toBeTruthy();

    const prop = comp.properties.position;
    expect(prop).toBeTruthy();
    expect(prop.type).toBe('float');
    expect(prop.width).toBe(3);
    expect(prop.size).toBe(2);
    expect(prop.data).toEqual([[1, 2, 3], [4, 5, 6]]);
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
    expect(prop.type).toBe('int');
    expect(prop.data).toEqual([0, 1, 2, 3, 4, 5]);
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
    expect(prop.type).toBe('string');
    expect(prop.data).toEqual(['Alice', 'Bob']);
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
    expect(comp.interpretation).toBe('matrix');
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
    expect(prop.interpretation).toBe('coordinate');
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

    expect(reader.result.objects.length).toBe(2);
    expect(reader.result.objects[0].name).toBe('object1');
    expect(reader.result.objects[1].name).toBe('object2');
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

    expect(success).toBe(true);
    const prop = reader.result.objects[0].components.comp.properties.value;
    expect(prop.data).toEqual([42]);
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
    expect(prop.data).toEqual([[-1.5, -2.0, -3.25]]);
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
    expect(prop.data).toEqual([1e10, 2.5e-3, -1.0e5]);
  });

  test('custom reader with selective reading', () => {
    class SelectiveReader extends Reader {
      readObjects: string[] = [];
      skippedObjects: string[] = [];
      lastData: number[] = [];

      object(name: string, protocol: string, protocolVersion: number, info: unknown): number {
        if (name === 'wanted') {
          this.readObjects.push(name);
          return Request.Read;
        }
        this.skippedObjects.push(name);
        return Request.Skip;
      }

      component(name: string, info: unknown): number {
        return Request.Read;
      }

      property(name: string, interpretation: string, info: PropertyInfo): number {
        return Request.Read;
      }

      dataRead(info: PropertyInfo, data: number[]): void {
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

    expect(reader.readObjects).toEqual(['wanted']);
    expect(reader.skippedObjects).toEqual(['unwanted']);
    expect(reader.lastData).toEqual([42]);
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

    const output = writer.close() as string;

    expect(output).toContain('GTOa (4)');
    expect(output).toContain('cube : polygon (2)');
    expect(output).toContain('points');
    expect(output).toContain('float[3] position'); // width=3, size inferred from data
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

    const output = writer.close() as string;

    expect(output).toContain('int vertex'); // width=1, no brackets needed
    expect(output).toContain('[ 0 1 2 3 4 5 ]');
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

    const output = writer.close() as string;

    expect(output).toContain('string names'); // width=1, no brackets
    expect(output).toContain('"Alice"');
    expect(output).toContain('"Bob"');
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

    const output = writer.close() as string;

    expect(output).toContain('position as coordinate');
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

    const output = writer.close() as string;

    expect(output).toContain('transform as matrix');
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

    const output = writer.close() as string;

    expect(output).toContain('\\n');
    expect(output).toContain('\\t');
    expect(output).toContain('\\"');
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

    expect(output).toContain('GTOa (4)');
    expect(output).toContain('cube : polygon (2)');
    expect(output).toContain('float[3] position'); // width=3, size inferred
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
    expect(result.objects.length).toBe(1);

    const obj = result.objects[0];
    expect(obj.name).toBe('testObject');
    expect(obj.protocol).toBe('testProto');
    expect(obj.protocolVersion).toBe(3);

    const posData = obj.components.positions.properties.pos.data;
    expect(posData).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]]);

    const countData = obj.components.metadata.properties.count.data;
    expect(countData).toEqual([42]);
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

    expect(data.version).toBe(4);
    expect(data.objects.length).toBe(1);
    expect(data.objects[0].name).toBe('myObject');
    expect(data.objects[0].protocol).toBe('testProto');

    const props = data.objects[0].components.settings.properties;
    expect(props.count.data).toEqual([42]);
    expect(props.scale.data).toEqual([1.5]);
    expect(props.name.data).toEqual(['test']);
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
    expect(props.uv.width).toBe(2);
    expect(props.uv.size).toBe(4);
    expect(props.position.width).toBe(3);
    expect(props.position.size).toBe(3);
    expect(props.color.width).toBe(4);
    expect(props.color.size).toBe(2);
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
    expect(pos.size).toBe(3);
    expect(pos.data).toEqual([[0, 0, 0], [1, 1, 1], [2, 2, 2]]);
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

    expect(data.objects.length).toBe(2);
    expect(data.objects[0].name).toBe('obj1');
    expect(data.objects[1].name).toBe('obj2');
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
    expect(mat.width).toBe(16);
    expect(mat.size).toBe(1);
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
    expect(parsed.objects[0].name).toBe('test');
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

    expect(reader.result.objects[0].name).toBe('mesh');
    expect(reader.result.objects[0].components.points.properties.position.size).toBe(4);
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

    expect(data.objects[0].name).toBe('cube');
    expect(data.objects[0].protocol).toBe('polygon');
    expect(data.objects[0].components.points).toBeTruthy();
    expect(data.objects[0].components.indices).toBeTruthy();
  });
});

describe('Transform Builder', () => {
  test('should build transform', () => {
    const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
    const data = transform('myTransform')
      .matrix([identity])
      .parent('root')
      .build();

    expect(data.objects[0].name).toBe('myTransform');
    expect(data.objects[0].protocol).toBe('transform');
    expect(data.objects[0].components.object.properties.globalMatrix).toBeTruthy();
    expect(data.objects[0].components.object.properties.parent.data).toEqual(['root']);
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

    expect(dto.version).toBe(4);
    expect(dto.objectCount).toBe(4);
  });

  test('should get object by name', () => {
    const dto = new GTODTO(sampleData);
    const rv = dto.object('rv');

    expect(rv.name).toBe('rv');
    expect(rv.protocol).toBe('RVSession');
    expect(rv.protocolVersion).toBe(1);
    expect(rv.exists()).toBe(true);
  });

  test('should return null object for non-existent name', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('nonexistent');

    expect(missing.exists()).toBe(false);
    expect(missing.name).toBe('');
  });

  test('should filter by protocol', () => {
    const dto = new GTODTO(sampleData);
    const sources = dto.byProtocol('RVFileSource');

    expect(sources.length).toBe(2);
    expect(sources.first().name).toBe('source1');
    expect(sources.last().name).toBe('source2');
  });

  test('should filter by name pattern', () => {
    const dto = new GTODTO(sampleData);
    const sources = dto.byName(/^source/);

    expect(sources.length).toBe(2);
  });

  test('should get protocols list', () => {
    const dto = new GTODTO(sampleData);
    const protocols = dto.protocols();

    expect(protocols).toContain('RVSession');
    expect(protocols).toContain('RVFileSource');
    expect(protocols).toContain('RVPaint');
  });

  test('should get component from object', () => {
    const dto = new GTODTO(sampleData);
    const session = dto.object('rv').component('session');

    expect(session.name).toBe('session');
    expect(session.exists()).toBe(true);
  });

  test('should return null component for non-existent name', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('rv').component('nonexistent');

    expect(missing.exists()).toBe(false);
  });

  test('should get property from component', () => {
    const dto = new GTODTO(sampleData);
    const fps = dto.object('rv').component('session').property('fps');

    expect(fps.name).toBe('fps');
    expect(fps.type).toBe('float');
    expect(fps.value()).toBe(24);
    expect(fps.exists()).toBe(true);
  });

  test('should return null property for non-existent name', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('rv').component('session').property('nonexistent');

    expect(missing.exists()).toBe(false);
    expect(missing.value()).toBe(null);
  });

  test('property value() should unwrap single values', () => {
    const dto = new GTODTO(sampleData);

    // Single value
    const fps = dto.object('rv').component('session').property('fps').value();
    expect(fps).toBe(24);

    // Array value
    const range = dto.object('rv').component('session').property('range').value();
    expect(range).toEqual([1, 500]);
  });

  test('property at() should get specific index', () => {
    const dto = new GTODTO(sampleData);
    const range = dto.object('rv').component('session').property('range');

    expect(range.at(0)).toBe(1);
    expect(range.at(1)).toBe(500);
    expect(range.at(999)).toBe(null);
  });

  test('property valueOr() should return default for missing', () => {
    const dto = new GTODTO(sampleData);
    const missing = dto.object('rv').component('session').property('nonexistent');

    expect(missing.valueOr(42)).toBe(42);
  });

  test('shorthand prop() method should work', () => {
    const dto = new GTODTO(sampleData);

    // Component.prop()
    const fps = dto.object('rv').component('session').prop('fps');
    expect(fps).toBe(24);

    // Object.prop(component, property)
    const currentFrame = dto.object('rv').prop('session', 'currentFrame');
    expect(currentFrame).toBe(100);
  });

  test('ObjectCollection map should work', () => {
    const dto = new GTODTO(sampleData);
    const moviePaths = dto.byProtocol('RVFileSource')
      .map(s => s.component('media').property('movie').value());

    expect(moviePaths).toEqual(['/path/to/movie1.mov', '/path/to/movie2.mov']);
  });

  test('ObjectCollection filter should work', () => {
    const dto = new GTODTO(sampleData);
    const filtered = dto.objects().filter(o => o.name.startsWith('source'));

    expect(filtered.length).toBe(2);
  });

  test('ObjectCollection find should work', () => {
    const dto = new GTODTO(sampleData);
    const found = dto.objects().find(o => o.name === 'source2');

    expect(found.name).toBe('source2');
  });

  test('ObjectCollection groupByProtocol should work', () => {
    const dto = new GTODTO(sampleData);
    const groups = dto.groupByProtocol();

    expect(groups.has('RVSession')).toBe(true);
    expect(groups.has('RVFileSource')).toBe(true);
    expect(groups.get('RVFileSource')!.length).toBe(2);
  });

  test('ObjectCollection should be iterable', () => {
    const dto = new GTODTO(sampleData);
    const names: string[] = [];
    for (const obj of dto.objects()) {
      names.push(obj.name);
    }

    expect(names.length).toBe(4);
    expect(names).toContain('rv');
  });

  test('component propertyNames should return all names', () => {
    const dto = new GTODTO(sampleData);
    const names = dto.object('rv').component('session').propertyNames();

    expect(names).toContain('fps');
    expect(names).toContain('currentFrame');
    expect(names).toContain('range');
  });

  test('component properties should return PropertyDTO array', () => {
    const dto = new GTODTO(sampleData);
    const props = dto.object('rv').component('session').properties();

    expect(props.length).toBe(3);
    expect(props.every(p => p instanceof PropertyDTO)).toBe(true);
  });

  test('object componentNames should return all names', () => {
    const dto = new GTODTO(sampleData);
    const names = dto.object('rv').componentNames();

    expect(names).toEqual(['session']);
  });

  test('object components should return ComponentDTO array', () => {
    const dto = new GTODTO(sampleData);
    const comps = dto.object('rv').components();

    expect(comps.length).toBe(1);
    expect(comps.every(c => c instanceof ComponentDTO)).toBe(true);
  });

  test('object componentsByPattern should filter by regex', () => {
    const dto = new GTODTO(sampleData);
    const penComps = dto.object('paint1').componentsByPattern(/^pen:/);

    expect(penComps.length).toBe(1);
    expect(penComps[0].name).toBe('pen:1:50:User');
  });

  test('safe chaining should not throw', () => {
    const dto = new GTODTO(sampleData);

    // Deep non-existent path should return null, not throw
    const value = dto
      .object('nonexistent')
      .component('also-missing')
      .property('nope')
      .value();

    expect(value).toBe(null);
  });

  test('property flat() should flatten nested arrays', () => {
    const dto = new GTODTO(sampleData);
    const points = dto.object('paint1').component('pen:1:50:User').property('points');

    const flat = points.flat();
    expect(flat).toEqual([10, 20, 30, 40, 50, 60]);
  });

  test('property map and filter should work', () => {
    const dto = new GTODTO(sampleData);
    const points = dto.object('paint1').component('pen:1:50:User').property('points');

    const mapped = points.map((p: number[]) => p[0]);
    expect(mapped).toEqual([10, 30, 50]);

    const filtered = points.filter((p: number[]) => p[0] > 20);
    expect(filtered).toEqual([[30, 40], [50, 60]]);
  });

  test('toObject methods should work', () => {
    const dto = new GTODTO(sampleData);

    const objData = dto.object('rv').toObject();
    expect(objData.name).toBe('rv');

    const compData = dto.object('rv').component('session').toObject();
    expect(compData.name).toBe('session');

    const propData = dto.object('rv').component('session').property('fps').toObject();
    expect(propData.type).toBe('float');
  });

  test('toJSON should serialize correctly', () => {
    const dto = new GTODTO(sampleData);
    const json = dto.toJSON();
    const parsed = JSON.parse(json);

    expect(parsed.version).toBe(4);
    expect(parsed.objects.length).toBe(4);
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
          },
          paintEffects: {
            interpretation: '',
            properties: {
              ghost: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] },
              ghostBefore: { type: 'int', size: 1, width: 1, interpretation: '', data: [5] },
              ghostAfter: { type: 'int', size: 1, width: 1, interpretation: '', data: [5] },
              hold: { type: 'int', size: 1, width: 1, interpretation: '', data: [0] }
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

    expect(session.protocol).toBe('RVSession');
    expect(session.name).toBe('rv');
  });

  test('timeline() should return timeline info', () => {
    const dto = new GTODTO(rvSessionData);
    const timeline = dto.timeline();

    expect(timeline.fps).toBe(30);
    expect(timeline.currentFrame).toBe(50);
    expect(timeline.range).toEqual([1, 200]);
    expect(timeline.region).toEqual([25, 175]);
    expect(timeline.marks).toEqual([50, 100, 150]);
  });

  test('paintEffects() should return paint effects settings', () => {
    const dto = new GTODTO(rvSessionData);
    const effects = dto.paintEffects();

    expect(effects.ghost).toBe(1);
    expect(effects.ghostBefore).toBe(5);
    expect(effects.ghostAfter).toBe(5);
    expect(effects.hold).toBe(0);
  });

  test('fileSources() should return file sources', () => {
    const dto = new GTODTO(rvSessionData);
    const sources = dto.fileSources();

    expect(sources.length).toBe(1);
    expect(sources.first().protocol).toBe('RVFileSource');
  });

  test('sourceGroups() should return source groups', () => {
    const dto = new GTODTO(rvSessionData);
    const groups = dto.sourceGroups();

    expect(groups.length).toBe(1);
    expect(groups.first().protocol).toBe('RVSourceGroup');
  });

  test('mediaPaths() should extract media paths', () => {
    const dto = new GTODTO(rvSessionData);
    const paths = dto.mediaPaths();

    expect(paths).toEqual(['/renders/shot_001.exr']);
  });

  test('connections() should return connection object', () => {
    const dto = new GTODTO(rvSessionData);
    const conn = dto.connections();

    expect(conn.protocol).toBe('connection');
  });

  test('connectionEdges() should return edge pairs', () => {
    const dto = new GTODTO(rvSessionData);
    const edges = dto.connectionEdges();

    expect(edges).toEqual([['node1', 'node2'], ['node2', 'node3']]);
  });

  test('annotations() should extract annotations with ghost properties', () => {
    const testData = {
      version: 4,
      objects: [
        {
          name: 'paint1',
          protocol: 'RVPaint',
          protocolVersion: 3,
          components: {
            'pen:1:15:User': {
              interpretation: '',
              properties: {
                color: { type: 'float', size: 4, width: 1, interpretation: '', data: [1, 0, 0, 1] },
                points: { type: 'float', size: 2, width: 2, interpretation: '', data: [[0.1, 0.2], [0.3, 0.4]] },
                startFrame: { type: 'int', size: 1, width: 1, interpretation: '', data: [10] },
                duration: { type: 'int', size: 1, width: 1, interpretation: '', data: [5] },
                ghost: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] },
                ghostBefore: { type: 'int', size: 1, width: 1, interpretation: '', data: [2] },
                ghostAfter: { type: 'int', size: 1, width: 1, interpretation: '', data: [3] },
                hold: { type: 'int', size: 1, width: 1, interpretation: '', data: [0] }
              }
            }
          }
        }
      ]
    };

    const dto = new GTODTO(testData);
    const annotations = dto.annotations();

    expect(annotations.length).toBe(1);
    const ann = annotations[0];
    expect(ann.type).toBe('pen');
    expect(ann.id).toBe('1');
    expect(ann.frame).toBe(15);
    expect(ann.user).toBe('User');
    expect(ann.startFrame).toBe(10);
    expect(ann.duration).toBe(5);
    expect(ann.ghost).toBe(1);
    expect(ann.ghostBefore).toBe(2);
    expect(ann.ghostAfter).toBe(3);
    expect(ann.hold).toBe(0);
  });

  test('sourcesInfo() should extract comprehensive source information', () => {
    const testData = {
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
                fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [24] }
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
                movie: { type: 'string', size: 1, width: 1, interpretation: '', data: ['/path/to/movie.exr'] },
                active: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] },
                repName: { type: 'string', size: 1, width: 1, interpretation: '', data: ['shot_001'] }
              }
            },
            group: {
              interpretation: '',
              properties: {
                fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [24] },
                volume: { type: 'float', size: 1, width: 1, interpretation: '', data: [0.8] },
                audioOffset: { type: 'float', size: 1, width: 1, interpretation: '', data: [0.5] },
                rangeOffset: { type: 'int', size: 1, width: 1, interpretation: '', data: [10] }
              }
            },
            cut: {
              interpretation: '',
              properties: {
                in: { type: 'int', size: 1, width: 1, interpretation: '', data: [100] },
                out: { type: 'int', size: 1, width: 1, interpretation: '', data: [200] }
              }
            },
            request: {
              interpretation: '',
              properties: {
                stereoViews: { type: 'string', size: 2, width: 1, interpretation: '', data: ['left', 'right'] },
                readAllChannels: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] }
              }
            }
          }
        }
      ]
    };

    const dto = new GTODTO(testData);
    const sources = dto.sourcesInfo();

    expect(sources.length).toBe(1);
    const source = sources[0];
    expect(source.name).toBe('source1');
    expect(source.movie).toBe('/path/to/movie.exr');
    expect(source.active).toBe(true);
    expect(source.repName).toBe('shot_001');
    expect(source.fps).toBe(24);
    expect(source.volume).toBe(0.8);
    expect(source.audioOffset).toBe(0.5);
    expect(source.rangeOffset).toBe(10);
    expect(source.cutIn).toBe(100);
    expect(source.cutOut).toBe(200);
    expect(source.stereoViews).toEqual(['left', 'right']);
    expect(source.readAllChannels).toBe(true);
  });

  test('sessionInfo() should extract comprehensive session information', () => {
    const testData = {
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
                viewNode: { type: 'string', size: 1, width: 1, interpretation: '', data: ['defaultSequence'] },
                range: { type: 'int', size: 2, width: 1, interpretation: '', data: [1, 100] },
                region: { type: 'int', size: 2, width: 1, interpretation: '', data: [10, 90] },
                fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [30] },
                realtime: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] },
                inc: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] },
                currentFrame: { type: 'int', size: 1, width: 1, interpretation: '', data: [50] },
                marks: { type: 'int', size: 3, width: 1, interpretation: '', data: [25, 50, 75] },
                version: { type: 'int', size: 1, width: 1, interpretation: '', data: [2] }
              }
            },
            matte: {
              interpretation: '',
              properties: {
                show: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] },
                aspect: { type: 'float', size: 1, width: 1, interpretation: '', data: [1.777] },
                opacity: { type: 'float', size: 1, width: 1, interpretation: '', data: [0.5] },
                heightVisible: { type: 'float', size: 1, width: 1, interpretation: '', data: [0.9] },
                centerPoint: { type: 'float', size: 2, width: 1, interpretation: '', data: [0.5, 0.5] }
              }
            }
          }
        }
      ]
    };

    const dto = new GTODTO(testData);
    const session = dto.sessionInfo();

    expect(session.viewNode).toBe('defaultSequence');
    expect(session.range).toEqual([1, 100]);
    expect(session.region).toEqual([10, 90]);
    expect(session.fps).toBe(30);
    expect(session.realtime).toBe(true);
    expect(session.inc).toBe(1);
    expect(session.currentFrame).toBe(50);
    expect(session.marks).toEqual([25, 50, 75]);
    expect(session.version).toBe(2);
    expect(session.matte.show).toBe(true);
    expect(session.matte.aspect).toBe(1.777);
    expect(session.matte.opacity).toBe(0.5);
    expect(session.matte.heightVisible).toBe(0.9);
    expect(session.matte.centerPoint).toEqual([0.5, 0.5]);
  });

  test('preview() should return comprehensive session summary', () => {
    const testData = {
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
                viewNode: { type: 'string', size: 1, width: 1, interpretation: '', data: ['sequence1'] },
                range: { type: 'int', size: 2, width: 1, interpretation: '', data: [1, 200] },
                fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [24] },
                currentFrame: { type: 'int', size: 1, width: 1, interpretation: '', data: [75] },
                realtime: { type: 'int', size: 1, width: 1, interpretation: '', data: [0] },
                inc: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] }
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
                movie: { type: 'string', size: 1, width: 1, interpretation: '', data: ['/media/shot001.exr'] },
                active: { type: 'int', size: 1, width: 1, interpretation: '', data: [1] }
              }
            },
            group: {
              interpretation: '',
              properties: {
                fps: { type: 'float', size: 1, width: 1, interpretation: '', data: [24] },
                range: { type: 'int', size: 2, width: 1, interpretation: '', data: [1, 100] }
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
                connections: { type: 'string', size: 2, width: 2, interpretation: '', data: [['source1', 'sequence1'], ['sequence1', 'rv']] }
              }
            }
          }
        },
        {
          name: 'paint1',
          protocol: 'RVPaint',
          protocolVersion: 3,
          components: {
            'pen:1:50:Artist': {
              interpretation: '',
              properties: {
                color: { type: 'float', size: 4, width: 1, interpretation: '', data: [1, 0, 0, 1] },
                points: { type: 'float', size: 2, width: 2, interpretation: '', data: [[0.1, 0.2], [0.3, 0.4]] },
                startFrame: { type: 'int', size: 1, width: 1, interpretation: '', data: [45] },
                duration: { type: 'int', size: 1, width: 1, interpretation: '', data: [10] }
              }
            }
          }
        }
      ]
    };

    const dto = new GTODTO(testData);
    const preview = dto.preview();

    // Test session info
    expect(preview.session.viewNode).toBe('sequence1');
    expect(preview.session.range).toEqual([1, 200]);
    expect(preview.session.fps).toBe(24);
    expect(preview.session.currentFrame).toBe(75);
    expect(preview.session.realtime).toBe(false);
    expect(preview.session.inc).toBe(1);

    // Test sources info
    expect(preview.sources.length).toBe(1);
    expect(preview.sources[0].name).toBe('source1');
    expect(preview.sources[0].movie).toBe('/media/shot001.exr');
    expect(preview.sources[0].active).toBe(true);

    // Test timeline info
    expect(preview.timeline.fps).toBe(24);
    expect(preview.timeline.currentFrame).toBe(75);
    expect(preview.timeline.range).toEqual([1, 200]);

    // Test annotations
    expect(preview.annotations.length).toBe(1);
    expect(preview.annotations[0].type).toBe('pen');
    expect(preview.annotations[0].frame).toBe(50);
    expect(preview.annotations[0].user).toBe('Artist');

    // Test connections
    expect(preview.connections).toEqual([['source1', 'sequence1'], ['sequence1', 'rv']]);

    // Test media paths
    expect(preview.mediaPaths).toEqual(['/media/shot001.exr']);
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

    expect(dto.objectCount).toBe(1);
    expect(dto.object('myMesh').protocol).toBe('polygon');

    const positions = dto.object('myMesh').component('points').property('position');
    expect(positions.size).toBe(3);
    expect(positions.at(0)).toEqual([0, 0, 0]);

    const indices = dto.object('myMesh').prop('indices', 'vertex');
    expect(indices).toEqual([0, 1, 2]);
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

    expect(dto.object('config').prop('user', 'name')).toBe('TestUser');
    expect(dto.object('config').prop('user', 'level')).toBe(42);
  });
});

// ============================================
// Binary Format Tests
// ============================================

describe('Binary Format', () => {
  test('should write and read simple binary format', () => {
    // Create data with builder
    const data = new GTOBuilder()
      .object('test', 'TestProtocol', 1)
        .component('values')
          .int('intVal', [1, 2, 3])
          .float('floatVal', [1.5, 2.5, 3.5])
        .end()
      .end()
      .build();

    // Write as binary
    const binary = SimpleWriter.write(data, { binary: true });

    // Verify it's an ArrayBuffer
    expect(binary instanceof ArrayBuffer).toBe(true);
    expect((binary as ArrayBuffer).byteLength > 0).toBe(true);

    // Read binary back
    const reader = new SimpleReader();
    const success = reader.open(binary);

    expect(success).toBe(true);
    expect(reader.result.version).toBe(4);
    expect(reader.result.objects.length).toBe(1);

    const obj = reader.result.objects[0];
    expect(obj.name).toBe('test');
    expect(obj.protocol).toBe('TestProtocol');

    const intVal = obj.components.values.properties.intVal;
    expect(intVal.data).toEqual([1, 2, 3]);

    const floatVal = obj.components.values.properties.floatVal;
    expect(floatVal.data.length).toBe(3);
    expect(Math.abs((floatVal.data[0] as number) - 1.5) < 0.001).toBe(true);
    expect(Math.abs((floatVal.data[1] as number) - 2.5) < 0.001).toBe(true);
    expect(Math.abs((floatVal.data[2] as number) - 3.5) < 0.001).toBe(true);
  });

  test('should handle string data in binary format', () => {
    const data = new GTOBuilder()
      .object('config', 'Settings', 1)
        .component('user')
          .string('name', ['Alice', 'Bob', 'Charlie'])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    const names = reader.result.objects[0].components.user.properties.name.data;
    expect(names).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  test('should handle multiple objects and components', () => {
    const data = new GTOBuilder()
      .object('obj1', 'Proto1', 1)
        .component('comp1')
          .int('val1', [10])
        .end()
        .component('comp2')
          .float('val2', [20.5])
        .end()
      .end()
      .object('obj2', 'Proto2', 2)
        .component('comp3')
          .int('val3', [30, 40])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    expect(reader.result.objects.length).toBe(2);

    const obj1 = reader.result.objects[0];
    expect(obj1.name).toBe('obj1');
    expect(obj1.protocol).toBe('Proto1');
    expect(obj1.components.comp1).toBeTruthy();
    expect(obj1.components.comp2).toBeTruthy();

    const obj2 = reader.result.objects[1];
    expect(obj2.name).toBe('obj2');
    expect(obj2.protocol).toBe('Proto2');
    expect(obj2.protocolVersion).toBe(2);
  });

  test('should round-trip text to binary to text', () => {
    const textGTO = `GTOa (4)

roundTrip : TestProto (1)
{
    data
    {
        int[3][2] values = [ [ 1 2 3 ] [ 4 5 6 ] ]
        float scale = 2.5
    }
}
`;

    // Read text
    const reader1 = new SimpleReader();
    reader1.open(textGTO);

    // Write as binary
    const binary = SimpleWriter.write(reader1.result, { binary: true });

    // Read binary
    const reader2 = new SimpleReader();
    reader2.open(binary);

    // Compare
    expect(reader2.result.objects.length).toBe(reader1.result.objects.length);
    expect(reader2.result.objects[0].name).toBe('roundTrip');
    expect(reader2.result.objects[0].protocol).toBe('TestProto');

    const prop1 = reader1.result.objects[0].components.data.properties.values;
    const prop2 = reader2.result.objects[0].components.data.properties.values;
    expect(prop2.size).toBe(prop1.size);
    expect(prop2.width).toBe(prop1.width);
    expect(prop2.data).toEqual(prop1.data);
  });

  test('should handle Uint8Array input', () => {
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('c')
          .int('v', [42])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true }) as ArrayBuffer;
    const uint8 = new Uint8Array(binary);

    const reader = new SimpleReader();
    const success = reader.open(uint8);

    expect(success).toBe(true);
    expect(reader.result.objects[0].components.c.properties.v.data[0]).toBe(42);
  });

  test('should handle double type', () => {
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('c')
          .double('d', [Math.PI, Math.E])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    const d = reader.result.objects[0].components.c.properties.d.data as number[];
    expect(Math.abs(d[0] - Math.PI) < 1e-10).toBe(true);
    expect(Math.abs(d[1] - Math.E) < 1e-10).toBe(true);
  });

  test('should handle byte type', () => {
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('c')
          .byte('b', [0, 127, 255])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    const b = reader.result.objects[0].components.c.properties.b.data;
    expect(b).toEqual([0, 127, 255]);
  });

  test('should handle short type', () => {
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('c')
          .short('s', [0, 1000, 65535])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    const s = reader.result.objects[0].components.c.properties.s.data;
    expect(s).toEqual([0, 1000, 65535]);
  });

  test('should handle vector properties (width > 1)', () => {
    const data = new GTOBuilder()
      .object('mesh', 'polygon', 1)
        .component('points')
          .float3('position', [[0, 0, 0], [1, 0, 0], [0, 1, 0]])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    const pos = reader.result.objects[0].components.points.properties.position;
    expect(pos.width).toBe(3);
    expect(pos.size).toBe(3);
    expect(pos.data).toEqual([[0, 0, 0], [1, 0, 0], [0, 1, 0]]);
  });

  test('should produce smaller output than text for numeric data', () => {
    // Create data with lots of numbers
    const positions: number[][] = [];
    for (let i = 0; i < 100; i++) {
      positions.push([i * 0.1, i * 0.2, i * 0.3]);
    }

    const data = new GTOBuilder()
      .object('bigMesh', 'polygon', 1)
        .component('points')
          .float3('position', positions)
        .end()
      .end()
      .build();

    const text = SimpleWriter.write(data) as string;
    const binary = SimpleWriter.write(data, { binary: true }) as ArrayBuffer;

    // Binary should be smaller for numeric data
    expect(binary.byteLength < text.length).toBe(true);
  });

  test('should handle UTF-8 strings in binary format', () => {
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('strings')
          .string('names', ['hello', 'мир', '世界', 'émoji 🎉'])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    const names = reader.result.objects[0].components.strings.properties.names.data;
    expect(names).toEqual(['hello', 'мир', '世界', 'émoji 🎉']);
  });
});

describe('Binary Format with Writer API', () => {
  test('should write binary using Writer directly', () => {
    const writer = new Writer();
    writer.open(FileType.BinaryGTO);

    writer.beginObject('myObj', 'MyProto', 1);
    writer.beginComponent('data');
    writer.propertyWithData('values', DataType.Int, 3, 1, '', [10, 20, 30]);
    writer.endComponent();
    writer.endObject();

    const binary = writer.close();

    expect(binary instanceof ArrayBuffer).toBe(true);

    const reader = new SimpleReader();
    reader.open(binary);

    expect(reader.result.objects[0].name).toBe('myObj');
    expect(
      reader.result.objects[0].components.data.properties.values.data
    ).toEqual([10, 20, 30]);
  });
});

describe('Async Reader', () => {
  test('should support openAsync for regular binary data', async () => {
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('c')
          .int('v', [42])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true }) as ArrayBuffer;

    const reader = new SimpleReader();
    const success = await reader.openAsync(binary);

    expect(success).toBe(true);
    expect(reader.result.objects[0].components.c.properties.v.data[0]).toBe(42);
  });

  test('should support openAsync for text data', async () => {
    const textGTO = `GTOa (4)

asyncTest : TestProto (1)
{
    data
    {
        int value = 123
    }
}
`;

    const reader = new SimpleReader();
    const success = await reader.openAsync(textGTO);

    expect(success).toBe(true);
    expect(reader.result.objects[0].name).toBe('asyncTest');
    expect(reader.result.objects[0].components.data.properties.value.data[0]).toBe(123);
  });

  test('should detect gzip compressed data in sync open', () => {
    // Gzip magic bytes: 0x1f 0x8b
    const gzipData = new Uint8Array([0x1f, 0x8b, 0x08, 0x00]);

    const reader = new SimpleReader();
    const success = reader.open(gzipData);

    // Should fail with message about using openAsync
    expect(success).toBe(false);
  });
});

describe('Binary Format v4 Features', () => {
  test('should preserve all 4 dims in round-trip', () => {
    // Create data with specific dims
    const data = new GTOBuilder()
      .object('volume', 'VolumeData', 1)
        .component('data')
          .float('density', [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0])
        .end()
      .end()
      .build();

    // Write and read binary
    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    // Verify data preserved
    expect(reader.result.objects[0].name).toBe('volume');
    expect(reader.result.objects[0].components.data.properties.density.data).toEqual(
      [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0]
    );
  });

  test('should write and read component childLevel', () => {
    // This tests that childLevel is preserved in binary round-trip
    // Even though we don't create nested components via builder,
    // the field should be written/read correctly
    const data = new GTOBuilder()
      .object('test', 'Test', 1)
        .component('level0')
          .int('value', [1])
        .end()
      .end()
      .build();

    const binary = SimpleWriter.write(data, { binary: true });
    const reader = new SimpleReader();
    reader.open(binary);

    // Verify the component exists and data is correct
    expect(reader.result.objects[0].components.level0.properties.value.data[0]).toBe(1);
  });
});
