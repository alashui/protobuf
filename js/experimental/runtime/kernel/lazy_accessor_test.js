/**
 * @fileoverview Tests for lazy_accessor.js.
 */
goog.module('protobuf.binary.LazyAccessorTest');

goog.setTestOnly();

const ByteString = goog.require('protobuf.ByteString');
const Int64 = goog.require('protobuf.Int64');
const InternalMessage = goog.require('protobuf.binary.InternalMessage');
const LazyAccessor = goog.require('protobuf.binary.LazyAccessor');
const TestMessage = goog.require('protobuf.testing.binary.TestMessage');
// Note to the reader:
// Since the lazy accessor behavior changes with the checking level some of the
// tests in this file have to know which checking level is enable to make
// correct assertions.
const {CHECK_BOUNDS, CHECK_CRITICAL_STATE, CHECK_CRITICAL_TYPE, CHECK_TYPE, MAX_FIELD_NUMBER} = goog.require('protobuf.internal.checks');

/**
 * @param {...number} bytes
 * @return {!ArrayBuffer}
 */
function createArrayBuffer(...bytes) {
  return new Uint8Array(bytes).buffer;
}

describe('LazyAccessor', () => {

  it('uses the default pivot point', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    expect(accessor.getPivot()).toBe(24);
  });

  it('makes the pivot point configurable', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0), 50);
    expect(accessor.getPivot()).toBe(50);
  });
});

describe('LazyAccessor hasFieldNumber', () => {
  it('returns false for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    expect(accessor.hasFieldNumber(1)).toBe(false);
  });

  it('returns true for non-empty input', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.hasFieldNumber(1)).toBe(true);
  });

  it('returns false for empty array', () => {
    const accessor = LazyAccessor.createEmpty();
    accessor.setPackedBoolIterable(1, []);
    expect(accessor.hasFieldNumber(1)).toBe(false);
  });

  it('returns true for non-empty array', () => {
    const accessor = LazyAccessor.createEmpty();
    accessor.setPackedBoolIterable(1, [true]);
    expect(accessor.hasFieldNumber(1)).toBe(true);
  });

  it('updates value after write', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    expect(accessor.hasFieldNumber(1)).toBe(false);
    accessor.setBool(1, false);
    expect(accessor.hasFieldNumber(1)).toBe(true);
  });
});

describe('LazyAccessor clear field does', () => {
  it('clear the field set', () => {
    const accessor = LazyAccessor.createEmpty();
    accessor.setBool(1, true);
    accessor.clearField(1);

    expect(accessor.hasFieldNumber(1)).toEqual(false);
    expect(accessor.serialize()).toEqual(new ArrayBuffer(0));
    expect(accessor.getBoolWithDefault(1)).toEqual(false);
  });

  it('clear the field decoded', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.clearField(1);

    expect(accessor.hasFieldNumber(1)).toEqual(false);
    expect(accessor.serialize()).toEqual(new ArrayBuffer(0));
    expect(accessor.getBoolWithDefault(1)).toEqual(false);
  });

  it('clear the field read', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getBoolWithDefault(1)).toEqual(true);
    accessor.clearField(1);

    expect(accessor.hasFieldNumber(1)).toEqual(false);
    expect(accessor.serialize()).toEqual(new ArrayBuffer(0));
    expect(accessor.getBoolWithDefault(1)).toEqual(false);
  });

  it('clear set and copied fields without affecting the old', () => {
    const accessor = LazyAccessor.createEmpty();
    accessor.setBool(1, true);

    const clonedAccessor = accessor.shallowCopy();
    clonedAccessor.clearField(1);

    expect(accessor.hasFieldNumber(1)).toEqual(true);
    expect(accessor.getBoolWithDefault(1)).toEqual(true);
    expect(clonedAccessor.hasFieldNumber(1)).toEqual(false);
    expect(clonedAccessor.serialize()).toEqual(new ArrayBuffer(0));
    expect(clonedAccessor.getBoolWithDefault(1)).toEqual(false);
  });

  it('clear decoded and copied fields without affecting the old', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);

    const clonedAccessor = accessor.shallowCopy();
    clonedAccessor.clearField(1);

    expect(accessor.hasFieldNumber(1)).toEqual(true);
    expect(accessor.getBoolWithDefault(1)).toEqual(true);
    expect(clonedAccessor.hasFieldNumber(1)).toEqual(false);
    expect(clonedAccessor.serialize()).toEqual(new ArrayBuffer(0));
    expect(clonedAccessor.getBoolWithDefault(1)).toEqual(false);
  });

  it('clear read and copied fields without affecting the old', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getBoolWithDefault(1)).toEqual(true);

    const clonedAccessor = accessor.shallowCopy();
    clonedAccessor.clearField(1);

    expect(accessor.hasFieldNumber(1)).toEqual(true);
    expect(accessor.getBoolWithDefault(1)).toEqual(true);
    expect(clonedAccessor.hasFieldNumber(1)).toEqual(false);
    expect(clonedAccessor.serialize()).toEqual(new ArrayBuffer(0));
    expect(clonedAccessor.getBoolWithDefault(1)).toEqual(false);
  });
});

describe('LazyAccessor shallow copy does', () => {
  it('work for singular fields', () => {
    const accessor = LazyAccessor.createEmpty();
    accessor.setBool(1, true);
    const clonedAccessor = accessor.shallowCopy();
    expect(clonedAccessor.getBoolWithDefault(1)).toEqual(true);

    accessor.setBool(1, false);
    expect(clonedAccessor.getBoolWithDefault(1)).toEqual(true);
  });

  it('work for repeated fields', () => {
    const accessor = LazyAccessor.createEmpty();

    accessor.addUnpackedBoolIterable(2, [true, true]);

    const clonedAccessor = accessor.shallowCopy();

    // Modify a repeated field after clone
    accessor.addUnpackedBoolElement(2, true);

    const array = Array.from(clonedAccessor.getRepeatedBoolIterable(2));
    expect(array).toEqual([true, true]);
  });

  it('work for repeated fields', () => {
    const accessor = LazyAccessor.createEmpty();

    accessor.addUnpackedBoolIterable(2, [true, true]);

    const clonedAccessor = accessor.shallowCopy();

    // Modify a repeated field after clone
    accessor.addUnpackedBoolElement(2, true);

    const array = Array.from(clonedAccessor.getRepeatedBoolIterable(2));
    expect(array).toEqual([true, true]);
  });

  it('return the correct bytes after serialization', () => {
    const bytes = createArrayBuffer(0x08, 0x01, 0x10, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes, /* pivot= */ 1);
    const clonedAccessor = accessor.shallowCopy();

    accessor.setBool(1, false);

    expect(clonedAccessor.getBoolWithDefault(1)).toEqual(true);
    expect(clonedAccessor.serialize()).toEqual(bytes);
  });
});

describe('LazyAccessor for singular boolean does', () => {
  it('return false for the empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    expect(accessor.getBoolWithDefault(
               /* fieldNumber= */ 1))
        .toBe(false);
  });

  it('return the value from the input', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getBoolWithDefault(
               /* fieldNumber= */ 1))
        .toBe(true);
  });

  it('encode the value from the input', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('encode the value from the input after read', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.getBoolWithDefault(
        /* fieldNumber= */ 1);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('return the value from multiple inputs', () => {
    const bytes = createArrayBuffer(0x08, 0x01, 0x08, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getBoolWithDefault(
               /* fieldNumber= */ 1))
        .toBe(false);
  });

  it('encode the value from multiple inputs', () => {
    const bytes = createArrayBuffer(0x08, 0x01, 0x08, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('encode the value from multiple inputs after read', () => {
    const bytes = createArrayBuffer(0x08, 0x01, 0x08, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.getBoolWithDefault(/* fieldNumber= */ 1);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('return the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01, 0x08, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setBool(1, true);
    expect(accessor.getBoolWithDefault(
               /* fieldNumber= */ 1))
        .toBe(true);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01, 0x08, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x01);
    accessor.setBool(1, true);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('return the bool value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getBoolWithDefault(
               /* fieldNumber= */ 1))
        .toBe(true);
    // Make sure the value is cached.
    bytes[1] = 0x00;
    expect(accessor.getBoolWithDefault(
               /* fieldNumber= */ 1))
        .toBe(true);
  });

  it('fail when getting bool value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getBoolWithDefault(/* fieldNumber= */ 1);
      }).toThrowError('Expected wire type: 0 but found: 1');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getBoolWithDefault(
                 /* fieldNumber= */ 1))
          .toBe(true);
    }
  });

  it('fail when setting bool value with out-of-range field number', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    if (CHECK_TYPE) {
      expect(() => accessor.setBool(MAX_FIELD_NUMBER + 1, false))
          .toThrowError('Field number is out of range: 536870912');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      accessor.setBool(MAX_FIELD_NUMBER + 1, false);
      expect(accessor.getBoolWithDefault(MAX_FIELD_NUMBER + 1)).toBe(false);
    }
  });

  it('fail when setting bool value with number value', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const fakeBoolean = /** @type {boolean} */ (/** @type {*} */ (2));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => accessor.setBool(1, fakeBoolean))
          .toThrowError('Must be a boolean, but got: 2');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      accessor.setBool(1, fakeBoolean);
      expect(accessor.getBoolWithDefault(
                 /* fieldNumber= */ 1))
          .toBe(2);
    }
  });
});

describe('LazyAccessor for singular message does', () => {
  it('return message from the input', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const msg = accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    expect(msg.getBoolWithDefault(1, false)).toBe(true);
  });

  it('return message from the input when pivot is set', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes, /* pivot= */ 0);
    const msg = accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    expect(msg.getBoolWithDefault(1, false)).toBe(true);
  });

  it('encode message from the input', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('encode message from the input after read', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('return message from multiple inputs', () => {
    const bytes =
        createArrayBuffer(0x0A, 0x02, 0x08, 0x01, 0x0A, 0x02, 0x10, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const msg = accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    expect(msg.getBoolWithDefault(1, false)).toBe(true);
    expect(msg.getBoolWithDefault(2, false)).toBe(true);
  });

  it('encode message from multiple inputs', () => {
    const bytes =
        createArrayBuffer(0x0A, 0x02, 0x08, 0x01, 0x0A, 0x02, 0x10, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.serialize()).toEqual(bytes);
  });

  it('encode message merged from multiple inputs after read', () => {
    const bytes =
        createArrayBuffer(0x0A, 0x02, 0x08, 0x01, 0x0A, 0x02, 0x10, 0x01);
    const expected = createArrayBuffer(0x0A, 0x04, 0x08, 0x01, 0x10, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    expect(accessor.serialize()).toEqual(expected);
  });

  it('return null for generic accessor', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const accessor1 = accessor.getMessageAccessorOrNull(7);
    expect(accessor1).toBe(null);
  });

  it('return null for generic accessor when pivot is set', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const accessor1 = accessor.getMessageAccessorOrNull(7, /* pivot= */ 0);
    expect(accessor1).toBe(null);
  });

  it('return generic accessor from the input', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const accessor1 = accessor.getMessageAccessorOrNull(1);
    expect(accessor1.getBoolWithDefault(1, false)).toBe(true);
    // Second call returns a new instance, isn't cached.
    const accessor2 = accessor.getMessageAccessorOrNull(1);
    expect(accessor2.getBoolWithDefault(1, false)).toBe(true);
    expect(accessor2).not.toBe(accessor1);
  });

  it('return generic accessor from the cached input', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const wrappedMessage =
        accessor.getMessageOrNull(1, TestMessage.instanceCreator);

    // Returns accessor from the cached wrapper instance.
    const accessor1 = accessor.getMessageAccessorOrNull(1);
    expect(accessor1.getBoolWithDefault(1, false)).toBe(true);
    expect(accessor1).toBe(
        (/** @type {!InternalMessage} */ (wrappedMessage)).internalGetKernel());

    // Second call returns exact same instance.
    const accessor2 = accessor.getMessageAccessorOrNull(1);
    expect(accessor2.getBoolWithDefault(1, false)).toBe(true);
    expect(accessor2).toBe(
        (/** @type {!InternalMessage} */ (wrappedMessage)).internalGetKernel());
    expect(accessor2).toBe(accessor1);
  });

  it('return message from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const subaccessor = LazyAccessor.fromArrayBuffer(bytes);
    const submsg1 = new TestMessage(subaccessor);
    accessor.setMessage(1, submsg1);
    const submsg2 = accessor.getMessage(1, TestMessage.instanceCreator);
    expect(submsg1).toBe(submsg2);
  });

  it('encode message from setter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const subaccessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const subsubaccessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    const subsubmsg = new TestMessage(subsubaccessor);
    subaccessor.setMessage(1, subsubmsg);
    const submsg = new TestMessage(subaccessor);
    accessor.setMessage(1, submsg);
    const expected = createArrayBuffer(0x0A, 0x04, 0x0A, 0x02, 0x08, 0x01);
    expect(accessor.serialize()).toEqual(expected);
  });

  it('encode message with multiple submessage from setter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const subaccessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const subsubaccessor1 =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    const subsubaccessor2 =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x02));

    const subsubmsg1 = new TestMessage(subsubaccessor1);
    const subsubmsg2 = new TestMessage(subsubaccessor2);

    subaccessor.setMessage(1, subsubmsg1);
    subaccessor.setMessage(2, subsubmsg2);

    const submsg = new TestMessage(subaccessor);
    accessor.setMessage(1, submsg);

    const expected = createArrayBuffer(
        0x0A, 0x08, 0x0A, 0x02, 0x08, 0x01, 0x12, 0x02, 0x08, 0x02);
    expect(accessor.serialize()).toEqual(expected);
  });

  it('leave hasFieldNumber unchanged after getMessageOrNull', () => {
    const accessor = LazyAccessor.createEmpty();
    expect(accessor.hasFieldNumber(1)).toBe(false);
    expect(accessor.getMessageOrNull(1, TestMessage.instanceCreator))
        .toBe(null);
    expect(accessor.hasFieldNumber(1)).toBe(false);
  });

  it('serialize changes to submessages made with getMessageOrNull', () => {
    const intTwoBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(intTwoBytes);
    const mutableSubMessage =
        accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    mutableSubMessage.setInt32(1, 10);
    const intTenBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x0A);
    expect(accessor.serialize()).toEqual(intTenBytes);
  });

  it('serialize additions to submessages made with getMessageOrNull', () => {
    const intTwoBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(intTwoBytes);
    const mutableSubMessage =
        accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    mutableSubMessage.setInt32(2, 3);
    // Sub message contains the original field, plus the new one.
    expect(accessor.serialize())
        .toEqual(createArrayBuffer(0x0A, 0x04, 0x08, 0x02, 0x10, 0x03));
  });

  it('fail with getMessageOrNull if immutable message exist in cache', () => {
    const intTwoBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(intTwoBytes);

    const readOnly = accessor.getMessage(1, TestMessage.instanceCreator);
    if (CHECK_TYPE) {
      expect(() => accessor.getMessageOrNull(1, TestMessage.instanceCreator))
          .toThrow();
    } else {
      const mutableSubMessage =
          accessor.getMessageOrNull(1, TestMessage.instanceCreator);
      // The instance returned by getMessageOrNull is the exact same instance.
      expect(mutableSubMessage).toBe(readOnly);

      // Serializing the submessage does not write the changes
      mutableSubMessage.setInt32(1, 0);
      expect(accessor.serialize()).toEqual(intTwoBytes);
    }
  });

  it('change hasFieldNumber after getMessageAttach', () => {
    const accessor = LazyAccessor.createEmpty();
    expect(accessor.hasFieldNumber(1)).toBe(false);
    expect(accessor.getMessageAttach(1, TestMessage.instanceCreator))
        .not.toBe(null);
    expect(accessor.hasFieldNumber(1)).toBe(true);
  });

  it('change hasFieldNumber after getMessageAttach when pivot is set', () => {
    const accessor = LazyAccessor.createEmpty();
    expect(accessor.hasFieldNumber(1)).toBe(false);
    expect(accessor.getMessageAttach(
               1, TestMessage.instanceCreator, /* pivot= */ 1))
        .not.toBe(null);
    expect(accessor.hasFieldNumber(1)).toBe(true);
  });

  it('serialize submessages made with getMessageAttach', () => {
    const accessor = LazyAccessor.createEmpty();
    const mutableSubMessage =
        accessor.getMessageAttach(1, TestMessage.instanceCreator);
    mutableSubMessage.setInt32(1, 10);
    const intTenBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x0A);
    expect(accessor.serialize()).toEqual(intTenBytes);
  });

  it('serialize additions to submessages using getMessageAttach', () => {
    const intTwoBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(intTwoBytes);
    const mutableSubMessage =
        accessor.getMessageAttach(1, TestMessage.instanceCreator);
    mutableSubMessage.setInt32(2, 3);
    // Sub message contains the original field, plus the new one.
    expect(accessor.serialize())
        .toEqual(createArrayBuffer(0x0A, 0x04, 0x08, 0x02, 0x10, 0x03));
  });

  it('fail with getMessageAttach if immutable message exist in cache', () => {
    const intTwoBytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(intTwoBytes);

    const readOnly = accessor.getMessage(1, TestMessage.instanceCreator);
    if (CHECK_TYPE) {
      expect(() => accessor.getMessageAttach(1, TestMessage.instanceCreator))
          .toThrow();
    } else {
      const mutableSubMessage =
          accessor.getMessageAttach(1, TestMessage.instanceCreator);
      // The instance returned by getMessageOrNull is the exact same instance.
      expect(mutableSubMessage).toBe(readOnly);

      // Serializing the submessage does not write the changes
      mutableSubMessage.setInt32(1, 0);
      expect(accessor.serialize()).toEqual(intTwoBytes);
    }
  });

  it('read default message return empty message with getMessage', () => {
    const bytes = new ArrayBuffer(0);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getMessage(1, TestMessage.instanceCreator)).toBeTruthy();
    expect(accessor.getMessage(1, TestMessage.instanceCreator).serialize())
        .toEqual(bytes);
  });

  it('read default message return null with getMessageOrNull', () => {
    const bytes = new ArrayBuffer(0);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getMessageOrNull(1, TestMessage.instanceCreator))
        .toBe(null);
  });

  it('read message preserve reference equality', () => {
    const bytes = createArrayBuffer(0x0A, 0x02, 0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const msg1 = accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    const msg2 = accessor.getMessageOrNull(1, TestMessage.instanceCreator);
    const msg3 = accessor.getMessageAttach(1, TestMessage.instanceCreator);
    expect(msg1).toBe(msg2);
    expect(msg1).toBe(msg3);
  });

  it('fail when getting message with other wire types', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    expect(() => accessor.getMessageOrNull(1, TestMessage.instanceCreator))
        .toThrow();
  });

  it('fail when submessage has incomplete data', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x0A, 0x01, 0x08));
    expect(() => accessor.getMessageOrNull(1, TestMessage.instanceCreator))
        .toThrow();
  });

  it('fail when mutable submessage has incomplete data', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x0A, 0x01, 0x08));
    expect(() => accessor.getMessageAttach(1, TestMessage.instanceCreator))
        .toThrow();
  });

  it('fail when getting message with null instance constructor', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x0A, 0x02, 0x08, 0x01));
    const nullMessage = /** @type {function(!LazyAccessor):!TestMessage} */
        (/** @type {*} */ (null));
    expect(() => accessor.getMessageOrNull(1, nullMessage)).toThrow();
  });

  it('fail when setting message value with null value', () => {
    const accessor = LazyAccessor.fromArrayBuffer(new ArrayBuffer(0));
    const fakeMessage = /** @type {!TestMessage} */ (/** @type {*} */ (null));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => accessor.setMessage(1, fakeMessage))
          .toThrowError('Given value is not a message instance: null');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      accessor.setMessage(1, fakeMessage);
      expect(accessor.getMessageOrNull(
                 /* fieldNumber= */ 1, TestMessage.instanceCreator))
          .toBeNull();
    }
  });
});

describe('Bytes access', () => {
  const simpleByteString = ByteString.fromArrayBuffer(createArrayBuffer(1));

  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getBytesWithDefault(1)).toEqual(ByteString.EMPTY);
  });

  it('returns the default from parameter', () => {
    const defaultByteString = ByteString.fromArrayBuffer(createArrayBuffer(1));
    const returnValue = ByteString.fromArrayBuffer(createArrayBuffer(1));
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getBytesWithDefault(1, defaultByteString))
        .toEqual(returnValue);
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x0A, 0x01, 0x01));
    expect(accessor.getBytesWithDefault(1)).toEqual(simpleByteString);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0A, 0x01, 0x00, 0x0A, 0x01, 0x01));
    expect(accessor.getBytesWithDefault(1)).toEqual(simpleByteString);
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getBytesWithDefault(1);
      }).toThrowError('Expected wire type: 2 but found: 1');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      const arrayBuffer = createArrayBuffer(1);
      expect(accessor.getBytesWithDefault(1))
          .toEqual(ByteString.fromArrayBuffer(arrayBuffer));
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(
          () => LazyAccessor.createEmpty().getBytesWithDefault(
              -1, simpleByteString))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(
          LazyAccessor.createEmpty().getBytesWithDefault(-1, simpleByteString))
          .toEqual(simpleByteString);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x0A, 0x01, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setBytes(1, simpleByteString);
    expect(accessor.getBytesWithDefault(1)).toEqual(simpleByteString);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x0A, 0x01, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x0A, 0x01, 0x01);
    accessor.setBytes(1, simpleByteString);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x0A, 0x01, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getBytesWithDefault(1)).toEqual(simpleByteString);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getBytesWithDefault(1)).toEqual(simpleByteString);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setBytes(-1, simpleByteString))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setBytes(-1, simpleByteString);
      expect(accessor.getBytesWithDefault(-1)).toEqual(simpleByteString);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setBytes(
              1, /** @type {!ByteString} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setBytes(
          1, /** @type {!ByteString} */ (/** @type {*} */ (null)));
      expect(accessor.getBytesWithDefault(1)).toEqual(null);
    }
  });
});

describe('Fixed32 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getFixed32WithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getFixed32WithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00));
    expect(accessor.getFixed32WithDefault(1)).toEqual(1);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x0D, 0x01, 0x00, 0x80, 0x00, 0x0D, 0x02, 0x00, 0x00, 0x00));
    expect(accessor.getFixed32WithDefault(1)).toEqual(2);
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x08, 0x80, 0x80, 0x80, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getFixed32WithDefault(1);
      }).toThrowError('Expected wire type: 5 but found: 0');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getFixed32WithDefault(1)).toEqual(8421504);
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getFixed32WithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getFixed32WithDefault(-1, 1))
          .toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setFixed32(1, 2);
    expect(accessor.getFixed32WithDefault(1)).toEqual(2);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00);
    accessor.setFixed32(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getFixed32WithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getFixed32WithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setFixed32(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFixed32(-1, 1);
      expect(accessor.getFixed32WithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setFixed32(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFixed32(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getFixed32WithDefault(1)).toEqual(null);
    }
  });
});

describe('Fixed64 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getFixed64WithDefault(1)).toEqual(Int64.fromInt(0));
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getFixed64WithDefault(1, Int64.fromInt(2)))
        .toEqual(Int64.fromInt(2));
  });

  it('decodes value from wire', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00));
    expect(accessor.getFixed64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0x02, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00));
    expect(accessor.getFixed64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  if (CHECK_CRITICAL_STATE) {
    it('fails when getting value with other wire types', () => {
      const accessor = LazyAccessor.fromArrayBuffer(
          createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
      expect(() => {
        accessor.getFixed64WithDefault(1);
      }).toThrow();
    });
  }

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(
          () => LazyAccessor.createEmpty().getFixed64WithDefault(
              -1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getFixed64WithDefault(
                 -1, Int64.fromInt(1)))
          .toEqual(Int64.fromInt(1));
    }
  });

  it('returns the value from setter', () => {
    const bytes =
        createArrayBuffer(0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setFixed64(1, Int64.fromInt(2));
    expect(accessor.getFixed64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('encode the value from setter', () => {
    const bytes =
        createArrayBuffer(0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes =
        createArrayBuffer(0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    accessor.setFixed64(1, Int64.fromInt(0));
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes =
        createArrayBuffer(0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getFixed64WithDefault(1)).toEqual(Int64.fromInt(1));
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getFixed64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setFixed64(-1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFixed64(-1, Int64.fromInt(1));
      expect(accessor.getFixed64WithDefault(-1)).toEqual(Int64.fromInt(1));
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setSfixed64(
              1, /** @type {!Int64} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFixed64(1, /** @type {!Int64} */ (/** @type {*} */ (null)));
      expect(accessor.getFixed64WithDefault(1)).toEqual(null);
    }
  });
});

describe('Float access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getFloatWithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getFloatWithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x80, 0x3F));
    expect(accessor.getFloatWithDefault(1)).toEqual(1);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x0D, 0x00, 0x00, 0x80, 0x3F, 0x0D, 0x00, 0x00, 0x80, 0xBF));
    expect(accessor.getFloatWithDefault(1)).toEqual(-1);
  });

  if (CHECK_CRITICAL_STATE) {
    it('fails when getting float value with other wire types', () => {
      const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
          0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x3F));
      expect(() => {
        accessor.getFloatWithDefault(1);
      }).toThrow();
    });
  }


  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getFloatWithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getFloatWithDefault(-1, 1)).toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x0D, 0x00, 0x00, 0x80, 0x3F);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setFloat(1, 1.6);
    expect(accessor.getFloatWithDefault(1)).toEqual(Math.fround(1.6));
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x0D, 0x00, 0x00, 0x80, 0x3F);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00);
    accessor.setFloat(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns float value from cache', () => {
    const bytes = createArrayBuffer(0x0D, 0x00, 0x00, 0x80, 0x3F);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getFloatWithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getFloatWithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setFloat(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFloat(-1, 1);
      expect(accessor.getFloatWithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setFloat(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFloat(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getFloatWithDefault(1)).toEqual(0);
    }
  });

  it('throws in setter for value outside of float32 precision', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(() => LazyAccessor.createEmpty().setFloat(1, Number.MAX_VALUE))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setFloat(1, Number.MAX_VALUE);
      expect(accessor.getFloatWithDefault(1)).toEqual(Infinity);
    }
  });
});

describe('Int32 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getInt32WithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getInt32WithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    expect(accessor.getInt32WithDefault(1)).toEqual(1);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01, 0x08, 0x02));
    expect(accessor.getInt32WithDefault(1)).toEqual(2);
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getInt32WithDefault(1);
      }).toThrowError('Expected wire type: 0 but found: 5');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getInt32WithDefault(1)).toEqual(0);
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getInt32WithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getInt32WithDefault(-1, 1)).toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setInt32(1, 2);
    expect(accessor.getInt32WithDefault(1)).toEqual(2);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x00);
    accessor.setInt32(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getInt32WithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getInt32WithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setInt32(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setInt32(-1, 1);
      expect(accessor.getInt32WithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setInt32(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setInt32(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getInt32WithDefault(1)).toEqual(null);
    }
  });
});

describe('Int64 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(0));
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getInt64WithDefault(1, Int64.fromInt(2)))
        .toEqual(Int64.fromInt(2));
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01, 0x08, 0x02));
    expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getInt64WithDefault(1);
      }).toThrowError('Expected wire type: 0 but found: 5');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(0));
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(
          () => LazyAccessor.createEmpty().getInt64WithDefault(
              -1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(
          LazyAccessor.createEmpty().getInt64WithDefault(-1, Int64.fromInt(1)))
          .toEqual(Int64.fromInt(1));
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setInt64(1, Int64.fromInt(2));
    expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x00);
    accessor.setInt64(1, Int64.fromInt(0));
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(1));
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getInt64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setInt64(-1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setInt64(-1, Int64.fromInt(1));
      expect(accessor.getInt64WithDefault(-1)).toEqual(Int64.fromInt(1));
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setInt64(
              1, /** @type {!Int64} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setInt64(1, /** @type {!Int64} */ (/** @type {*} */ (null)));
      expect(accessor.getInt64WithDefault(1)).toEqual(null);
    }
  });
});

describe('Sfixed32 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSfixed32WithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSfixed32WithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00));
    expect(accessor.getSfixed32WithDefault(1)).toEqual(1);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x0D, 0x01, 0x00, 0x80, 0x00, 0x0D, 0x02, 0x00, 0x00, 0x00));
    expect(accessor.getSfixed32WithDefault(1)).toEqual(2);
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x08, 0x80, 0x80, 0x80, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getSfixed32WithDefault(1);
      }).toThrowError('Expected wire type: 5 but found: 0');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getSfixed32WithDefault(1)).toEqual(8421504);
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getSfixed32WithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getSfixed32WithDefault(-1, 1))
          .toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setSfixed32(1, 2);
    expect(accessor.getSfixed32WithDefault(1)).toEqual(2);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00);
    accessor.setSfixed32(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x0D, 0x01, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getSfixed32WithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getSfixed32WithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setSfixed32(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSfixed32(-1, 1);
      expect(accessor.getSfixed32WithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setSfixed32(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSfixed32(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getSfixed32WithDefault(1)).toEqual(null);
    }
  });
});

describe('Sfixed64 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSfixed64WithDefault(1)).toEqual(Int64.fromInt(0));
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSfixed64WithDefault(1, Int64.fromInt(2)))
        .toEqual(Int64.fromInt(2));
  });

  it('decodes value from wire', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00));
    expect(accessor.getSfixed64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x09, 0x02, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00));
    expect(accessor.getSfixed64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  if (CHECK_CRITICAL_STATE) {
    it('fails when getting value with other wire types', () => {
      const accessor = LazyAccessor.fromArrayBuffer(
          createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
      expect(() => {
        accessor.getSfixed64WithDefault(1);
      }).toThrow();
    });
  }

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(
          () => LazyAccessor.createEmpty().getSfixed64WithDefault(
              -1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getSfixed64WithDefault(
                 -1, Int64.fromInt(1)))
          .toEqual(Int64.fromInt(1));
    }
  });

  it('returns the value from setter', () => {
    const bytes =
        createArrayBuffer(0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setSfixed64(1, Int64.fromInt(2));
    expect(accessor.getSfixed64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('encode the value from setter', () => {
    const bytes =
        createArrayBuffer(0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes =
        createArrayBuffer(0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    accessor.setSfixed64(1, Int64.fromInt(0));
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes =
        createArrayBuffer(0x09, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getSfixed64WithDefault(1)).toEqual(Int64.fromInt(1));
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getSfixed64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setSfixed64(-1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSfixed64(-1, Int64.fromInt(1));
      expect(accessor.getSfixed64WithDefault(-1)).toEqual(Int64.fromInt(1));
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setSfixed64(
              1, /** @type {!Int64} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSfixed64(1, /** @type {!Int64} */ (/** @type {*} */ (null)));
      expect(accessor.getSfixed64WithDefault(1)).toEqual(null);
    }
  });
});

describe('Sint32 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSint32WithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSint32WithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x02));
    expect(accessor.getSint32WithDefault(1)).toEqual(1);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x03, 0x08, 0x02));
    expect(accessor.getSint32WithDefault(1)).toEqual(1);
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getSint32WithDefault(1);
      }).toThrowError('Expected wire type: 0 but found: 5');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getSint32WithDefault(1)).toEqual(0);
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getSint32WithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getSint32WithDefault(-1, 1)).toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setSint32(1, 2);
    expect(accessor.getSint32WithDefault(1)).toEqual(2);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x00);
    accessor.setSint32(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getSint32WithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getSint32WithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setSint32(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSint32(-1, 1);
      expect(accessor.getSint32WithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setSint32(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSint32(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getSint32WithDefault(1)).toEqual(null);
    }
  });
});

describe('SInt64 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(0));
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getSint64WithDefault(1, Int64.fromInt(2)))
        .toEqual(Int64.fromInt(2));
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x02));
    expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01, 0x08, 0x02));
    expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getSint64WithDefault(1);
      }).toThrowError('Expected wire type: 0 but found: 5');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(0));
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(
          () => LazyAccessor.createEmpty().getSint64WithDefault(
              -1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(
          LazyAccessor.createEmpty().getSint64WithDefault(-1, Int64.fromInt(1)))
          .toEqual(Int64.fromInt(1));
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setSint64(1, Int64.fromInt(2));
    expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x00);
    accessor.setSint64(1, Int64.fromInt(0));
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x02);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(1));
    // Make sure the value is cached.
    bytes[1] = 0x00;
    expect(accessor.getSint64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setSint64(-1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setInt64(-1, Int64.fromInt(1));
      expect(accessor.getSint64WithDefault(-1)).toEqual(Int64.fromInt(1));
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setSint64(
              1, /** @type {!Int64} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setSint64(1, /** @type {!Int64} */ (/** @type {*} */ (null)));
      expect(accessor.getSint64WithDefault(1)).toEqual(null);
    }
  });
});

describe('String access', () => {
  it('returns empty string for the empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getStringWithDefault(1)).toEqual('');
  });

  it('returns the default for the empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getStringWithDefault(1, 'bar')).toEqual('bar');
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x0A, 0x01, 0x61));
    expect(accessor.getStringWithDefault(1)).toEqual('a');
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0A, 0x01, 0x60, 0x0A, 0x01, 0x61));
    expect(accessor.getStringWithDefault(1)).toEqual('a');
  });

  if (CHECK_CRITICAL_STATE) {
    it('fails when getting string value with other wire types', () => {
      const accessor = LazyAccessor.fromArrayBuffer(
          createArrayBuffer(0x08, 0x02, 0x08, 0x08));
      expect(() => {
        accessor.getStringWithDefault(1);
      }).toThrow();
    });
  }


  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getStringWithDefault(-1, 'a'))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getStringWithDefault(-1, 'a'))
          .toEqual('a');
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x0A, 0x01, 0x61);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setString(1, 'b');
    expect(accessor.getStringWithDefault(1)).toEqual('b');
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x0A, 0x01, 0x61);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x0A, 0x01, 0x62);
    accessor.setString(1, 'b');
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns string value from cache', () => {
    const bytes = createArrayBuffer(0x0A, 0x01, 0x61);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getStringWithDefault(1)).toBe('a');
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getStringWithDefault(1)).toBe('a');
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_TYPE) {
      expect(() => LazyAccessor.createEmpty().setString(-1, 'a'))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setString(-1, 'a');
      expect(accessor.getStringWithDefault(-1)).toEqual('a');
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setString(
              1, /** @type {string} */ (/** @type {*} */ (null))))
          .toThrowError('Must be string, but got: null');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setString(1, /** @type {string} */ (/** @type {*} */ (null)));
      expect(accessor.getStringWithDefault(1)).toEqual(null);
    }
  });
});

describe('Uint32 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getUint32WithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getUint32WithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    expect(accessor.getUint32WithDefault(1)).toEqual(1);
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01, 0x08, 0x02));
    expect(accessor.getUint32WithDefault(1)).toEqual(2);
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getUint32WithDefault(1);
      }).toThrowError('Expected wire type: 0 but found: 5');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getUint32WithDefault(1)).toEqual(0);
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getUint32WithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getUint32WithDefault(-1, 1)).toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setUint32(1, 2);
    expect(accessor.getUint32WithDefault(1)).toEqual(2);
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x00);
    accessor.setUint32(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getUint32WithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getUint32WithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setInt32(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setUint32(-1, 1);
      expect(accessor.getUint32WithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setUint32(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setUint32(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getUint32WithDefault(1)).toEqual(null);
    }
  });
});

describe('Uint64 access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(0));
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getUint64WithDefault(1, Int64.fromInt(2)))
        .toEqual(Int64.fromInt(2));
  });

  it('decodes value from wire', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01));
    expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('decodes value from wire with multple values being present', () => {
    const accessor =
        LazyAccessor.fromArrayBuffer(createArrayBuffer(0x08, 0x01, 0x08, 0x02));
    expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('fails when getting value with other wire types', () => {
    const accessor = LazyAccessor.fromArrayBuffer(
        createArrayBuffer(0x0D, 0x00, 0x00, 0x00, 0x00));
    if (CHECK_CRITICAL_TYPE) {
      expect(() => {
        accessor.getUint64WithDefault(1);
      }).toThrowError('Expected wire type: 0 but found: 5');
    } else {
      // Note in unchecked mode we produce invalid output for invalid inputs.
      // This test just documents our behavior in those cases.
      // These values might change at any point and are not considered
      // what the implementation should be doing here.
      expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(0));
    }
  });

  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(
          () => LazyAccessor.createEmpty().getUint64WithDefault(
              -1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(
          LazyAccessor.createEmpty().getUint64WithDefault(-1, Int64.fromInt(1)))
          .toEqual(Int64.fromInt(1));
    }
  });

  it('returns the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setUint64(1, Int64.fromInt(2));
    expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(2));
  });

  it('encode the value from setter', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes = createArrayBuffer(0x08, 0x00);
    accessor.setUint64(1, Int64.fromInt(0));
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns value from cache', () => {
    const bytes = createArrayBuffer(0x08, 0x01);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(1));
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getUint64WithDefault(1)).toEqual(Int64.fromInt(1));
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setUint64(-1, Int64.fromInt(1)))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setUint64(-1, Int64.fromInt(1));
      expect(accessor.getUint64WithDefault(-1)).toEqual(Int64.fromInt(1));
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setUint64(
              1, /** @type {!Int64} */ (/** @type {*} */ (null))))
          .toThrow();
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setUint64(1, /** @type {!Int64} */ (/** @type {*} */ (null)));
      expect(accessor.getUint64WithDefault(1)).toEqual(null);
    }
  });
});

describe('Double access', () => {
  it('returns default value for empty input', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getDoubleWithDefault(1)).toEqual(0);
  });

  it('returns the default from parameter', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer());
    expect(accessor.getDoubleWithDefault(1, 2)).toEqual(2);
  });

  it('decodes value from wire', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F));
    expect(accessor.getDoubleWithDefault(1)).toEqual(1);
  });


  it('decodes value from wire with multple values being present', () => {
    const accessor = LazyAccessor.fromArrayBuffer(createArrayBuffer(
        0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F, 0x09, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0xF0, 0xBF));
    expect(accessor.getDoubleWithDefault(1)).toEqual(-1);
  });

  if (CHECK_CRITICAL_STATE) {
    it('fails when getting double value with other wire types', () => {
      const accessor = LazyAccessor.fromArrayBuffer(
          createArrayBuffer(0x0D, 0x00, 0x00, 0xF0, 0x3F));
      expect(() => {
        accessor.getDoubleWithDefault(1);
      }).toThrow();
    });
  }


  it('throws in getter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().getDoubleWithDefault(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      expect(LazyAccessor.createEmpty().getDoubleWithDefault(-1, 1)).toEqual(1);
    }
  });

  it('returns the value from setter', () => {
    const bytes =
        createArrayBuffer(0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    accessor.setDouble(1, 2);
    expect(accessor.getDoubleWithDefault(1)).toEqual(2);
  });

  it('encode the value from setter', () => {
    const bytes =
        createArrayBuffer(0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    const newBytes =
        createArrayBuffer(0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);
    accessor.setDouble(1, 0);
    expect(accessor.serialize()).toEqual(newBytes);
  });

  it('returns string value from cache', () => {
    const bytes =
        createArrayBuffer(0x09, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xF0, 0x3F);
    const accessor = LazyAccessor.fromArrayBuffer(bytes);
    expect(accessor.getDoubleWithDefault(1)).toBe(1);
    // Make sure the value is cached.
    bytes[2] = 0x00;
    expect(accessor.getDoubleWithDefault(1)).toBe(1);
  });

  it('throws in setter for invalid fieldNumber', () => {
    if (CHECK_BOUNDS) {
      expect(() => LazyAccessor.createEmpty().setDouble(-1, 1))
          .toThrowError('Field number is out of range: -1');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setDouble(-1, 1);
      expect(accessor.getDoubleWithDefault(-1)).toEqual(1);
    }
  });

  it('throws in setter for invalid value', () => {
    if (CHECK_CRITICAL_TYPE) {
      expect(
          () => LazyAccessor.createEmpty().setDouble(
              1, /** @type {number} */ (/** @type {*} */ (null))))
          .toThrowError('Must be a number, but got: null');
    } else {
      const accessor = LazyAccessor.createEmpty();
      accessor.setDouble(1, /** @type {number} */ (/** @type {*} */ (null)));
      expect(accessor.getDoubleWithDefault(1)).toEqual(null);
    }
  });
});
