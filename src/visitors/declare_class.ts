import {
  Identifier,
  DeclareClass,
  classDeclaration,
  classBody,
  classProperty,
  tsDeclareMethod,
  tsTypeAnnotation,
  tsParenthesizedType,
  isTSFunctionType,
  isObjectTypeSpreadProperty,
  ClassBody,
  isTypeParameterDeclaration,
} from '@babel/types';
import { NodePath } from '@babel/traverse';

import { warnOnlyOnce } from '../util';
import { convertFlowType } from '../converters/convert_flow_type';
import { convertInterfaceExtends } from '../converters/convert_interface_declaration';
import { convertTypeParameterDeclaration } from '../converters/convert_type_parameter_declaration';
import { convertObjectTypeIndexer } from '../converters/convert_object_type_indexer';

declare module '@babel/types' {
  interface ObjectTypeProperty {
    method: boolean;
  }
}

export function DeclareClass(path: NodePath<DeclareClass>) {
  const node = path.node;
  const extendsNode = node.extends;
  const properties = node.body.properties;

  const bodyElements: ClassBody['body'] = [];

  for (const property of properties) {
    if (isObjectTypeSpreadProperty(property)) {
      throw path.buildCodeFrameError('ObjectTypeSpreadProperty is unexpected in DeclareClass');
    }

    let convertedProperty = convertFlowType(property.value);
    if (isTSFunctionType(convertedProperty)) {
      convertedProperty = tsParenthesizedType(convertedProperty);
    }

    if (property.method) {
      const converted = tsDeclareMethod(
        null,
        property.key,
        null, // todo: convertedProperty.typeParameters,
        // @ts-ignore
        convertedProperty.typeAnnotation.parameters,
        // @ts-ignore
        convertedProperty.typeAnnotation.typeAnnotation,
      );

      converted.static = property.static;
      // @ts-ignore
      converted.kind = property.kind;
      bodyElements.push(converted);
    } else if (property.kind === 'init') {
      const converted = classProperty(property.key, null, tsTypeAnnotation(convertedProperty));
      converted.static = property.static;
      bodyElements.push(converted);
    }
  }

  // todo:
  // if (node.body.callProperties) {
  //   bodyElements.push(...node.body.callProperties.map(convertObjectTypeCallProperty));
  // }

  if (node.body.indexers) {
    bodyElements.push(...node.body.indexers.map(convertObjectTypeIndexer));
  }

  // todo:
  // if (node.body.internalSlots) {
  //   bodyElements.push(...node.body.internalSlots.map(convertObjectTypeInternalSlot));
  // }

  const decl = classDeclaration(path.node.id, null, classBody(bodyElements), []);

  decl.declare = true;
  if (isTypeParameterDeclaration(node.typeParameters)) {
    decl.typeParameters = convertTypeParameterDeclaration(node.typeParameters);
  }

  if (extendsNode && extendsNode.length) {
    if (extendsNode.length > 1) {
      warnOnlyOnce(
        'declare-class-many-parents',
        'Declare Class definitions in TS can only have one super class. Dropping extras.',
      );
    }

    const firstExtend = convertInterfaceExtends(extendsNode[0]);
    decl.superClass = firstExtend.expression as Identifier;
    decl.superTypeParameters = firstExtend.typeParameters;
  }
  path.replaceWith(decl);
}
